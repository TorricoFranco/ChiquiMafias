const express = require('express');
const router = express.Router();
const { handleReportAlert } = require('../controllers/webhookController');
const { handleNewTicketAlert } = require('../controllers/webhookController');
const { handleForwardMessage } = require('../controllers/webhookController');

router.post('/alerts/report', handleReportAlert);
router.post('/tickets/new', handleNewTicketAlert);
router.post('/tickets/forward-message', handleForwardMessage);

module.exports = router;