export function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}
export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: `${Object.keys(err.keyValue || {})[0] || 'Value'} already exists.` });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong.' });
}
export const fail = (res, status, message) => res.status(status).json({ message });
