/**
 * Pawse feedback receiver for a Google Apps Script Web App.
 *
 * Required Script properties:
 *   PAWSE_FEEDBACK_DOC_ID  Google Doc id that receives feedback
 *   PAWSE_FEEDBACK_SECRET  Same value as the server env var
 */

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doPost(event) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const documentId = properties.getProperty('PAWSE_FEEDBACK_DOC_ID');
    const expectedSecret = properties.getProperty('PAWSE_FEEDBACK_SECRET');

    if (!documentId || !expectedSecret) {
      return jsonResponse({ ok: false, error: 'Receiver is not configured.' });
    }

    const payload = JSON.parse((event.postData && event.postData.contents) || '{}');
    if (payload.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' });
    }

    const message = String(payload.message || '').trim();
    if (!message) return jsonResponse({ ok: false, error: 'Message is required.' });

    const receivedAt = payload.receivedAt ? new Date(payload.receivedAt) : new Date();
    const timestamp = Utilities.formatDate(
      receivedAt,
      Session.getScriptTimeZone() || 'America/Los_Angeles',
      'yyyy-MM-dd HH:mm:ss z',
    );
    const metadata = [
      payload.email && `Email: ${payload.email}`,
      payload.platform && `Platform: ${payload.platform}`,
      payload.appVersion && `Version: ${payload.appVersion}`,
      payload.id && `Delivery ID: ${payload.id}`,
    ].filter(Boolean);

    const document = DocumentApp.openById(documentId);
    const body = document.getBody();
    body.appendHorizontalRule();
    body.appendParagraph(timestamp).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(message);
    if (metadata.length) body.appendParagraph(metadata.join(' · ')).setForegroundColor('#666666');
    document.saveAndClose();

    return jsonResponse({ ok: true, id: payload.id || null });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}
