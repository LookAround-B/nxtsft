import { BulkPhotoUploader } from "@/components/photo-bulk/BulkPhotoUploader";
import { PageHead } from "./PageHead";

export function BulkPhotosTab() {
  return (
    <>
      <PageHead
        title="Bulk Photos"
        subtitle="Upload photos per property and download their URLs — paste into the Image URLs column of a bulk listing file."
      />
      <BulkPhotoUploader />
    </>
  );
}
