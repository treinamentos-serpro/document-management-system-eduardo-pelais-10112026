const AppError = require('../errors/appError');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'O arquivo excede o limite de 10 MiB.',
      },
    });
    return;
  }

  if (error.name === 'MulterError') {
    res.status(400).json({
      error: {
        code: 'INVALID_UPLOAD',
        message: 'A requisição de upload é inválida. Envie um arquivo no campo "file".',
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Ocorreu um erro interno.',
    },
  });
}

module.exports = errorHandler;