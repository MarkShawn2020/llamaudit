'use server';

import {
  validatedAction,
  validatedActionWithUser,
} from '@/lib/auth/middleware';
import { getSession } from '@/lib/auth/session';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import {
  activityLogs,
  ActivityType,
  invitations,
  teamMembers,
  teams,
  User,
  users,
  type NewActivityLog,
  type NewTeam,
  type NewTeamMember,
  type NewUser,
} from '@/lib/db/schema';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { ActionState } from '@/lib/types';
import { and, eq, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

async function logActivity(
  teamId: number | null | undefined,
  userId: string, // Expect UUID as string
  type: ActivityType,
  ipAddress?: string,
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  
  try {
    const newActivity: NewActivityLog = {
      teamId,
      userId,
      action: type,
      ipAddress: ipAddress || '',
    };
    
    await db.insert(activityLogs).values(newActivity);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;

  try {
    const userWithTeam = await db
      .select({
        user: users,
        team: teams,
      })
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .leftJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(users.email, email))
      .limit(1);

    if (userWithTeam.length === 0) {
      return {
        error: '邮箱或密码错误，请重试',
        email,
        password,
      };
    }

    const { user: foundUser, team: foundTeam } = userWithTeam[0];

    const isPasswordValid = await comparePasswords(
      password,
      foundUser.passwordHash,
    );

    if (!isPasswordValid) {
      return {
        error: '邮箱或密码错误，请重试',
        email,
        password,
      };
    }

    await Promise.all([
      setSession(foundUser),
      logActivity(foundTeam?.id, foundUser.id, ActivityType.SIGN_IN),
    ]);

    const redirectTo = formData.get('redirect') as string | null;
    if (redirectTo === 'checkout') {
      const priceId = formData.get('priceId') as string;
      return createCheckoutSession({ team: foundTeam, priceId });
    }

    redirect('/projects');
  } catch (error) {
    // Next.js redirect() 会抛出特殊错误，不应该被捕获
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }
    
    console.error('Sign in error:', error);
    
    // 如果是数据库连接错误，返回友好的错误信息
    if (error instanceof Error && error.message.includes('数据库')) {
      return {
        error: error.message,
        email,
        password,
      };
    }
    
    // 对于其他错误，返回通用错误信息
    return {
      error: '登录失败，请稍后重试',
      email,
      password,
    };
  }
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional(),
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, inviteId } = data;

  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return {
        error: '该邮箱已被注册，请使用其他邮箱',
        email,
        password,
      };
    }

    const passwordHash = await hashPassword(password);

    const newUser: NewUser = {
      email,
      passwordHash,
      role: 'owner', // Default role, will be overridden if there's an invitation
    };

    const [createdUser] = await db.insert(users).values(newUser).returning();

    if (!createdUser) {
      return {
        error: '创建用户失败，请重试',
        email,
        password,
      };
    }

    let teamId: number;
    let userRole: string;
    let createdTeam: typeof teams.$inferSelect | null = null;

    if (inviteId) {
      // Check if there's a valid invitation
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.id, parseInt(inviteId)),
            eq(invitations.email, email),
            eq(invitations.status, 'pending'),
          ),
        )
        .limit(1);

      if (invitation) {
        teamId = invitation.teamId;
        userRole = invitation.role;

        await db
          .update(invitations)
          .set({ status: 'accepted' })
          .where(eq(invitations.id, invitation.id));

        await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);

        [createdTeam] = await db
          .select()
          .from(teams)
          .where(eq(teams.id, teamId))
          .limit(1);
      } else {
        return { error: '邀请链接无效或已过期', email, password };
      }
    } else {
      // Create a new team if there's no invitation
      const newTeam: NewTeam = {
        name: `${email}'s Team`,
      };

      [createdTeam] = await db.insert(teams).values(newTeam).returning();

      if (!createdTeam) {
        return {
          error: '创建团队失败，请重试',
          email,
          password,
        };
      }

      teamId = createdTeam.id;
      userRole = 'owner';

      await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);
    }

    const newTeamMember: NewTeamMember = {
      userId: createdUser.id, // Now using UUID directly
      teamId: teamId,
      role: userRole,
    };

    await Promise.all([
      db.insert(teamMembers).values(newTeamMember),
      logActivity(teamId, createdUser.id, ActivityType.SIGN_UP),
      setSession(createdUser),
    ]);

    const redirectTo = formData.get('redirect') as string | null;
    if (redirectTo === 'checkout') {
      const priceId = formData.get('priceId') as string;
      return createCheckoutSession({ team: createdTeam, priceId });
    }

    redirect('/projects');
  } catch (error) {
    // Next.js redirect() 会抛出特殊错误，不应该被捕获
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }
    
    console.error('Sign up error:', error);
    
    // 如果是数据库连接错误，返回友好的错误信息
    if (error instanceof Error && error.message.includes('数据库')) {
      return {
        error: error.message,
        email,
        password,
      };
    }
    
    // 对于其他错误，返回通用错误信息
    return {
      error: '注册失败，请稍后重试',
      email,
      password,
    };
  }
});


export async function signOut() {
  const user = await getUser();
  
  // Check if user exists before logging activity
  if (user) {
    try {
      // Get team information to log activity
      const userWithTeam = await getUserWithTeam(user.id);
      if (userWithTeam?.teamId) {
        await logActivity(userWithTeam.teamId, user.id, ActivityType.SIGN_OUT);
      }
    } catch (error) {
      console.error("Error during signOut activity logging:", error);
      // Continue with cookie deletion even if logging fails
    }
  }
  
  // Always clear the session cookie
  (await cookies()).delete('session');
}

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(100),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword } = data;

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return { error: 'Current password is incorrect.' };
    }

    if (currentPassword === newPassword) {
      return {
        error: 'New password must be different from the current password.',
      };
    }

    const newPasswordHash = await hashPassword(newPassword);
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD),
    ]);

    return { success: 'Password updated successfully.' };
  },
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100),
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return { error: 'Incorrect password. Account deletion failed.' };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    await logActivity(
      userWithTeam?.teamId,
      user.id,
      ActivityType.DELETE_ACCOUNT,
    );

    // Soft delete
    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')`, // Ensure email uniqueness
      } as any) // Using 'as any' to bypass the type checking for deletedAt
      .where(eq(users.id, user.id));

    if (userWithTeam?.teamId) {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, user.id), // Using UUID directly
            eq(teamMembers.teamId, userWithTeam.teamId),
          ),
        );
    }

    (await cookies()).delete('session');
    redirect('/sign-in');
  },
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
});

export const updateAccount = async (formData: FormData): Promise<ActionState> => {
  const user = await getUser();
  if (!user) {
    return { error: '用户未登录' };
  }

  const name = formData.get('name') as string;
  
  try {
    await db
      .update(users)
      .set({ name })
      .where(eq(users.id, user.id));

    return { success: '更新成功' };
  } catch (error) {
    console.error('Failed to update account:', error);
    return { error: '更新失败' };
  }
};

/**
 * Returns the current authenticated user data
 * This action is used to synchronize client-side user state after login/registration
 * @returns The authenticated user or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const session = await getSession();
    if (!session) return null;
    
    const user = await getUser();
    return user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

const removeTeamMemberSchema = z.object({
  memberId: z.number(),
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, userWithTeam.teamId),
        ),
      );

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER,
    );

    return { success: 'Team member removed successfully' };
  },
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner']),
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(
          eq(users.email, email),
          eq(teamMembers.teamId, userWithTeam.teamId),
        ),
      )
      .limit(1);

    if (existingMember.length > 0) {
      return { error: 'User is already a member of this team' };
    }

    // Check if there's an existing invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending'),
        ),
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return { error: 'An invitation has already been sent to this email' };
    }

    // Create a new invitation
    await db.insert(invitations).values({
      teamId: userWithTeam.teamId,
      email,
      role,
      invitedBy: user.id, // Using UUID directly now
      status: 'pending',
    });

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.INVITE_TEAM_MEMBER,
    );

    // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
    // await sendInvitationEmail(email, userWithTeam.team.name, role)

    return { success: 'Invitation sent successfully' };
  },
);
