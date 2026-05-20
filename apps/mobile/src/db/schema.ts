import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'subjects',
      columns: [
        { name: 'remote_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'level', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'documents',
      columns: [
        { name: 'remote_id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'level', type: 'string' },
        { name: 'year', type: 'number', isOptional: true },
        { name: 'session', type: 'string', isOptional: true },
        { name: 'is_premium', type: 'boolean' },
        { name: 'subject_id', type: 'string', isOptional: true },
        { name: 'subject_name', type: 'string', isOptional: true },
        { name: 'local_pdf_path', type: 'string', isOptional: true },
        { name: 'downloaded_at', type: 'number', isOptional: true },
      ],
    }),
  ],
})
