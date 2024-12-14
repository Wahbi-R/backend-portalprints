const db = require('../config/db.config');

// Retrieve all products
const getAllProducts = async (userId = null) => {
    // TODO: Pagination (limit/offset)
    const result = await db.query(
        `SELECT *
        FROM products;`
    );
    return result.rows;
};

// Retrieve a specific product by ID, including its variants
const getProductById = async (productId) => {
    const productResult = await db.query('SELECT * FROM products WHERE product_id = $1', [productId]);
    const variantsResult = await db.query('SELECT * FROM variants WHERE product_id = $1', [productId]);

    const product = productResult.rows[0];
    if (product) {
        product.variants = variantsResult.rows;
    }
    return product;
};

// Create a new product
const createProduct = async (productData) => {
    const { user_id, external_product_id, name, description } = productData;
    const result = await db.query(
        `INSERT INTO products (user_id, external_product_id, name, description)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user_id, external_product_id, name, description]
    );
    return result.rows[0];
};

// Update an existing product by ID
const updateProduct = async (productId, productData) => {
    const { name, description } = productData;
    const result = await db.query(
        `UPDATE products
         SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $3
         RETURNING *`,
        [name, description, productId]
    );
    return result.rows[0];
};

// Delete a product by ID
const deleteProduct = async (productId) => {
    const result = await db.query('DELETE FROM products WHERE product_id = $1 RETURNING *', [productId]);
    return result.rows[0];
};

// Create a new variant for a product
const createVariant = async (productId, variantData) => {
    const { variant_name, price, sku, stock_quantity } = variantData;
    const result = await db.query(
        `INSERT INTO variants (product_id, variant_name, price, sku, stock_quantity)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [productId, variant_name, price, sku, stock_quantity]
    );
    return result.rows[0];
};

// Update a variant by ID
const updateVariant = async (variantId, variantData) => {
    const { variant_name, price, sku, stock_quantity } = variantData;
    const result = await db.query(
        `UPDATE variants
         SET variant_name = $1, price = $2, sku = $3, stock_quantity = $4
         WHERE variant_id = $5
         RETURNING *`,
        [variant_name, price, sku, stock_quantity, variantId]
    );
    return result.rows[0];
};

// Delete a variant by ID
const deleteVariant = async (variantId) => {
    const result = await db.query('DELETE FROM variants WHERE variant_id = $1 RETURNING *', [variantId]);
    return result.rows[0];
};

const getProductsByStoreId = async (storeId) => {
    const result = await db.query(
        `SELECT 
            o.*,
            s.store_name 
         FROM products o
         JOIN stores s ON o.store_id = s.store_id
         WHERE o.store_id = $1`,
        [storeId]
    );
    return result.rows;
};

const getProductsByVendor = async (vendor) => {
    const result = await db.query(
        `SELECT * 
         FROM products 
         WHERE vendor = $1`,
        [vendor]
    );
    return result.rows;
};

const getProductOptions = async (productId) => {
    const result = await db.query(
        `
        SELECT
            vo.variant_id,
            vo.name,
            vo.value
        FROM variant_options vo
        INNER JOIN variants v ON v.variant_id = vo.variant_id
        INNER JOIN products p ON p.product_id = v.product_id
        WHERE p.product_id = $1
        `,
        [productId]
    );

    // group by options
    const options = {};
    for (const row of result.rows) {
        options[row.name] = options[row.name] ?? { name: row.name, values: [] };
        options[row.name].values.push({ variantId: row.variant_id, value: row.value });
    }
    // Return options as an array
    return Object.values(options);
}

/**
 * Get all products, along with any existing metadata for the current store.
 * @param {string?} storeId
 * @returns 
 */
const getProductsWithStoreMeta = async (storeId) => {
    // TODO: Pagination (limit + offset)
    const result = await db.query(
        `
        SELECT 
            p.product_id,
            p.name,
            p.description,
            p.created_at,
            p.updated_at,
			p.image_url,
            p.price,
            sv.store_id,
            sv.external_product_id,
            sv.availability
        FROM products p
			LEFT OUTER JOIN store_variants sv
				ON sv.product_id = p.product_id
        WHERE sv.store_id = $1 OR sv.store_id IS NULL;
		`,
        [storeId]
    );
    return result.rows;
}

/**
 * Get a single product with its variants, along with any existing metadata 
 * for the current store.
 * @param {number} productId
 * @param {string} storeId
 * @returns The product, if it exists
 */
const getProductByIdWithStoreMeta = async (productId, storeId) => {
    // TODO: Pagination (limit + offset)
    const result = await db.query(
        `
        SELECT 
            p.product_id,
            p.name,
            p.description,
            p.created_at,
            p.updated_at,
			p.image_url,
            p.price,
            v.variant_id,
            v.sku,
            sv.store_id,
            sv.external_product_id,
            sv.external_variant_id,
            sv.availability
        FROM products p
            INNER JOIN variants v
                ON p.product_id = v.product_id
			LEFT OUTER JOIN store_variants sv
				ON p.product_id = sv.product_id
        WHERE 
            (p.product_id = $1)
            AND (sv.store_id = $2 OR sv.store_id IS NULL);
		`,
        [productId, storeId]
    );

    // No product
    if (result.rows === 0) return undefined;

    // Fill product metadata from first row (should be the same for all rows)
    const firstRow = result.rows[0];
    const product = {
        name: firstRow.name,
        description: firstRow.description,
        created_at: firstRow.created_at,
        updated_at: firstRow.updated_at,
        image_url: firstRow.image_url,
        price: firstRow.price,
        store_id: firstRow.store_id,
        external_product_id: firstRow.external_product_id,

        variants: [] 
    };

    // Group by variants
    for (const row of result.rows) {
        product.variants.push({
            variant_id: row.variant_id,
            sku: row.sku,
            external_variant_id: row.external_variant_id,
            availability: row.availability,
        });
    }

    return product;
};

const saveStoreVariants = async (storeId, productId, externalProductId, storeVariants) => {
    const rows = [];
    await db.query("START TRANSACTION;");
    try {
        // dunno why pg doesn't have bulk inserts, so this has to be done the old-fashioned way
        for (const v of storeVariants) {
            console.log("INSERT", [storeId, productId, v.variant_id, externalProductId, v.external_variant_id])
            const result = await db.query(
                `
                INSERT INTO store_variants (
                    store_id,
                    product_id,
                    variant_id,
                    external_product_id,
                    external_variant_id
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *;
                `,
                [storeId, productId, v.variant_id, externalProductId, v.external_variant_id]
            );
            rows.push(...result.rows);
        }
        await db.query("COMMIT");
    } catch (error) {
        console.error(error);
        await db.query("ROLLBACK");
    }
    return rows;
}


module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    createVariant,
    updateVariant,
    deleteVariant,
    getProductsByStoreId,
    getProductsByVendor,
    getProductsWithStoreMeta,
    getProductByIdWithStoreMeta,
    getProductOptions,
    saveStoreVariants,
};
