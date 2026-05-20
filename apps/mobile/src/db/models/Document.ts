import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class DocumentModel extends Model {
  static table = 'documents'

  @field('remote_id') remoteId!: string
  @field('title') title!: string
  @field('type') type!: string
  @field('level') level!: string
  @field('year') year!: number | null
  @field('session') session!: string | null
  @field('is_premium') isPremium!: boolean
  @field('subject_name') subjectName!: string | null
  @field('local_pdf_path') localPdfPath!: string | null
  @field('downloaded_at') downloadedAt!: number | null

  get isDownloaded() {
    return !!this.localPdfPath
  }
}
