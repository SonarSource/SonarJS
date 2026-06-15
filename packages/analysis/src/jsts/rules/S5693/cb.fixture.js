const multer = require('multer');
const { diskStorage } = require('multer');
const { randomBytes } = require('crypto');
const { extname } = require('path');

const tmpFolder = '/tmp';

function slugify(str) {
  return str;
}

// Compliant: diskStorage is a multer sub-function.
const config = {
  storage: diskStorage({
    destination: tmpFolder,
    filename(_request, file, callback) {
      const fileHash = randomBytes(10).toString('hex');
      const extension = extname(file.originalname);
      const name = slugify(
        file.originalname.replace(new RegExp(`${extension}$`), ''),
      );
      const fileName = fileHash.concat('-', name, extension);
      return callback(null, fileName);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
    fieldSize: 1024 * 1024,
    fieldNameSize: 5,
    files: 1,
  },
};

// multer without limits is not compliant
const upload = multer({ storage }); // Noncompliant {{Make sure the content length limit is safe here.}}

const upload_safe = multer(config); // Compliant
