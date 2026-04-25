import { Request, Response, NextFunction } from "express";
import {
  getMultipleFilesPath,
  getSingleFilePath,
  IFolderName,
} from "../../shared/getFilePath";
interface FileFieldConfig {
  fieldName: IFolderName;
  forceMultiple?: boolean;
  forceSingle?: boolean;
}
type FieldInput = IFolderName | FileFieldConfig;
const parseAllFilesData = (...fields: FieldInput[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fileData: any = {};
      for (const field of fields) {
        const fieldName = typeof field === "string" ? field : field.fieldName;
        const forceMultiple = typeof field !== "string" && field.forceMultiple;
        const forceSingle = typeof field !== "string" && field.forceSingle;

        let filePaths: string | string[] | undefined;

        if (forceMultiple) {
          filePaths = getMultipleFilesPath(req.files, fieldName);
        } else if (forceSingle) {
          filePaths = getSingleFilePath(req.files, fieldName);
        } else {
          const files = (
            req.files as { [fieldname: string]: Express.Multer.File[] }
          )[fieldName];
          filePaths = files ? files.map((file) => file.path) : [];
        }

        if (filePaths) {
          fileData[fieldName] = filePaths;
        }
      }

      // Handle body data and merge with file paths
      if (req.body && req.body.data) {
        const data = JSON.parse(req.body.data);
        req.body = { ...data, ...fileData };
      } else {
        req.body = { ...fileData };
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default parseAllFilesData;
