const DATE_SHORT_OPTS = { month: '2-digit', day: '2-digit', year: '2-digit' };

export const formatDateShort = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', DATE_SHORT_OPTS);

export const formatSessionListDate = (dateString) =>
  new Date(dateString).toLocaleString('en-US', {
    ...DATE_SHORT_OPTS,
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatSessionDetailDate = (dateString) =>
  new Date(dateString).toLocaleString('en-US', {
    ...DATE_SHORT_OPTS,
    hour: '2-digit',
    minute: '2-digit',
  });
