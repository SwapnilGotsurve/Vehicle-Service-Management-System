export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || (err.name === 'ValidationError' ? 422 : 500);
  res.status(status).json({ success: false, message: status === 500 ? 'Something went wrong on the server' : err.message });
}
