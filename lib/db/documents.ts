"use server"

import { withConnection } from "."
import type { DB } from "./index"
import { files } from "./schema"
import { eq, and } from "drizzle-orm"

import { getUser } from "./queries"

export const getFilesByProjectId = async (projectId: string) => {
    const user = await getUser()
    if (!user) throw new Error("User not authenticated")
    return withConnection(async (db: DB) => {
        return db.select().from(files)
            .where(
                and(
                    eq(files.auditUnitId, projectId),
                    eq(files.userId, user.id)
                )
            )
    })
}