import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { schema } from './schema'
import { DocumentModel } from './models/Document'

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'kelassi',
  jsi: true,
  onSetUpError: (error) => {
    console.error('WatermelonDB setup error', error)
  },
})

export const database = new Database({
  adapter,
  modelClasses: [DocumentModel],
})

export { DocumentModel }
