const { check, validationResult } = require('express-validator');

const validateOrder = [
    check('total_cost').isNumeric().withMessage('Total cost must be a number'),
    check('shipping_cost').isNumeric().withMessage('Shipping cost must be a number'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = validateOrder;
