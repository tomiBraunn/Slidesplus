import multer from "multer"
export const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		const allowedMimes = [
			'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-powerpoint',
			'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			'text/plain',
			'text/csv',
			'text/html',
			'text/css',
			'application/json',
			'application/javascript',
			'text/javascript',
			'application/x-python',
			'application/x-java',
			'application/x-php',
			'application/zip',
			'application/x-zip-compressed',
			'application/x-rar-compressed'
		]

		if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
			cb(null, true)
		} else {
			cb(new Error(`File type ${file.mimetype} not allowed`))
		}
	}
})

export const uploadImage = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) {
			cb(null, true)
		} else {
			cb(new Error("Only images are allowed"))
		}
	}
})