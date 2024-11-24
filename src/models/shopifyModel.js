const db = require('../config/db.config');

const addProductsAndVariants = async (products, variants, uid, storeDomain) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN'); // Start transaction

        const productIdsMap = {};

        // Insert or update products
        for (const product of products) {
            const result = await client.query(
                `INSERT INTO products (external_product_id, user_id, name, description, vendor, store_id, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, 
                    (SELECT store_id FROM stores WHERE store_domain = $6), NOW(), NOW())
                 ON CONFLICT (external_product_id) DO UPDATE
                 SET name = EXCLUDED.name,
                     description = EXCLUDED.description,
                     vendor = EXCLUDED.vendor,
                     updated_at = NOW()
                 RETURNING product_id`,
                [
                    product.external_product_id,
                    uid,
                    product.name,
                    product.description,
                    product.vendor,
                    storeDomain,
                ]
            );

            // Map the external product ID to the generated or existing internal product ID
            productIdsMap[product.external_product_id] = result.rows[0].product_id;
        }

        // Insert or update variants
        for (const variant of variants) {
            const productId = productIdsMap[variant.external_parent_id];
            if (productId) {
                await client.query(
                    `INSERT INTO variants (product_id, variant_name, price, sku, external_variant_id, external_parent_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     ON CONFLICT (external_variant_id) DO UPDATE
                     SET variant_name = EXCLUDED.variant_name,
                         price = EXCLUDED.price,
                         sku = EXCLUDED.sku,
                         updated_at = NOW()`,
                    [
                        productId,
                        variant.variant_name,
                        variant.price,
                        variant.sku,
                        variant.external_variant_id,
                        variant.external_parent_id,
                    ]
                );
            } else {
                console.warn(
                    `Variant with external_parent_id ${variant.external_parent_id} does not match any product. Skipping.`
                );
            }
        }

        await client.query('COMMIT'); // Commit transaction
    } catch (error) {
        await client.query('ROLLBACK'); // Rollback transaction on error
        console.error("Error adding or updating products and variants:", error.message);
        throw error;
    } finally {
        client.release(); // Release the client
    }
};

const storeOrdersAndItems = async (uid, storeDomain, ordersMap) => {
    const client = await db.connect(); // Use your DB client

    try {
        await client.query('BEGIN'); // Start transaction

        // Fetch the `store_id` for the given `uid` and `storeDomain`
        const storeResult = await client.query(
            'SELECT store_id FROM stores WHERE user_id = $1 AND store_domain = $2',
            [uid, storeDomain]
        );

        if (storeResult.rows.length === 0) {
            throw new Error('Store not found for the given user_id and store_domain');
        }

        const storeId = storeResult.rows[0].store_id;
        console.log("storeId is", storeId);

        for (const [orderId, orderData] of Object.entries(ordersMap)) {
            // Extract fields from orderData
            const {
                external_order_id,
                name,
                displayFulfillmentStatus,
                createdAt,
                total_cost,
                currency,
                shippingAddress,
                customer,
                lineItems,
            } = orderData;

            // Concatenate customer name (if available)
            const customerName = customer
                ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                : null;

            const shippingAddressString = shippingAddress
                ? `${shippingAddress.address1 || ''}, ${shippingAddress.address2 || ''} ${shippingAddress.city || ''}, ${shippingAddress.country || ''} ${shippingAddress.zip || ''}`
                : null;

            const orderQuery = `
                INSERT INTO orders (
                    user_id, store_id, customer_name, order_status, order_date, total_cost, currency, shipping_address, external_order_id, source, external_order_name
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (external_order_id)
                DO UPDATE SET
                    customer_name = EXCLUDED.customer_name,
                    order_status = EXCLUDED.order_status,
                    order_date = EXCLUDED.order_date,
                    shipping_address = EXCLUDED.shipping_address,
                    total_cost = EXCLUDED.total_cost,
                    currency = EXCLUDED.currency,
                    external_order_name = EXCLUDED.external_order_name;
            `;

            await client.query(orderQuery, [
                uid,
                storeId,
                customerName, 
                displayFulfillmentStatus,
                createdAt,
                total_cost,
                currency,
                shippingAddressString,
                external_order_id,
                'shopify',
                name,
            ]);

            // Get the order ID from the database
            const orderIdResult = await client.query(
                'SELECT order_id FROM orders WHERE external_order_id = $1',
                [external_order_id]
            );

            const dbOrderId = orderIdResult.rows[0].order_id;

            // Insert or update line items
            for (const lineItem of lineItems) {
                // Fetch `product_id` from the database
                const productResult = await client.query(
                    'SELECT product_id FROM products WHERE external_product_id = $1',
                    [lineItem.product_id]
                );
                const productId = productResult.rows.length > 0 ? productResult.rows[0].product_id : null;

                // Fetch `variant_id` from the database (if applicable)
                const variantResult = await client.query(
                    'SELECT variant_id FROM variants WHERE external_variant_id = $1',
                    [lineItem.variant_id]
                );
                const variantId = variantResult.rows.length > 0 ? variantResult.rows[0].variant_id : null;

                const lineItemQuery = `
                    INSERT INTO order_items (
                        order_id, product_id, variant_id, quantity, item_price, currency, external_parent_id
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (external_parent_id)
                    DO UPDATE SET
                        quantity = EXCLUDED.quantity,
                        item_price = EXCLUDED.item_price,
                        currency = EXCLUDED.currency;
                `;

                await client.query(lineItemQuery, [
                    dbOrderId,
                    productId,
                    variantId, 
                    lineItem.quantity,
                    lineItem.item_price,
                    lineItem.currency,
                    lineItem.external_parent_id,
                ]);
            }
        }

        await client.query('COMMIT'); 
    } catch (error) {
        await client.query('ROLLBACK'); // Rollback transaction on error
        throw error;
    } finally {
        client.release();
    }
};



module.exports = { 
    addProductsAndVariants, 
    storeOrdersAndItems,
};