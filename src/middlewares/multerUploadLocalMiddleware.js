import { StatusCodes } from 'http-status-codes'
import multer from 'multer'
import ApiError from '~/utils/ApiError'
import { ALLOW_COMMON_FILE_TYPES, LIMIT_COMMON_FILE_SIZE } from '~/utils/validators'
import path from 'path'

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
  const destinationPath = path.join(__dirname, '../uploads/user/')
  callback(null, destinationPath)
  },
  filename: function (req, file, callback) {
    const nameFile = `${Date.now()}-${file.originalname}`
    callback(null, nameFile)
  }
})

const customFileFilter = (req, file, callBack) => {
  // Doi voi multer check type file use "mimetype"
  if (!ALLOW_COMMON_FILE_TYPES.includes(file.mimetype)) {
    const errMessage = 'File type is invalid. Only accept jpg, jpeg and png'
    return callBack(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errMessage), null)
  }
  // neu nu kieu file hop le
  return callBack(null, true)
}

const uploadLocal = multer({
  storage:storage,
  limits: { fileSize: LIMIT_COMMON_FILE_SIZE },
  fileFilter: customFileFilter
})

export const multerUploadLocalMiddleware = { uploadLocal }
