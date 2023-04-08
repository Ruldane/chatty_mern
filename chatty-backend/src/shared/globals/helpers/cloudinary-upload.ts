import cloudinary, { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

/**
 * This function is used to upload a file to the cloudinary server. It returns a promise that resolves to an error or result object.
 * @param file The file to upload
 * @param public_id The public id to give the uploaded file. If not specified, it will be generated automatically.
 * @param overwrite Whether to overwrite a file with the same name on the cloudinary server.
 * @param invalidate Whether to invalidate a previously uploaded file with the same name.
 * @returns A promise that resolves to an error or result object.
 */
export function uploads(
  file: string,
  public_id?: string,
  overwrite?: boolean,
  invalidate?: boolean
): Promise<UploadApiResponse | UploadApiErrorResponse | undefined> {
  return new Promise((resolve) => {
    cloudinary.v2.uploader.upload(
      file,
      {
        public_id,
        overwrite,
        invalidate
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error) resolve(error);
        resolve(result);
      }
    );
  });
}
