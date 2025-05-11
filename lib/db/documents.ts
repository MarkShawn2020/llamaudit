"use server"

import { withConnection } from "."
import type { DB } from "./index"
import { files } from "./schema"
import { eq, and } from "drizzle-orm"

import { getUser } from "./queries"
import { validatedActionWithUser } from "../auth/middleware"
import { z } from "zod"


export const getFilesByProjectId = validatedActionWithUser(z.object({projectId: z.string()}), async (data, formData, user) => {
    return withConnection(async (db: DB) => {
        return db.select().from(files)
            .where(
                and(
                    eq(files.auditUnitId, data.projectId),
                    eq(files.userId, user.id)
                )
            )
    })
})