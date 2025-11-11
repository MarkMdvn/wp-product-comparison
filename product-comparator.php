<?php

/**
 * Plugin Name:       Product Comparator
 * Description:       A simple product comparator plugin for WooCommerce.
 * Version:           2.1.0
 * Author:            Mark Mordvin
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       product-comparator
 * Domain Path:       /languages
 */

if (! defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

/**
 * Enqueue scripts and styles.
 */
function product_comparator_enqueue_assets()
{
    // Make sure to enqueue only on pages where the shortcode is present
    if (is_singular() && has_shortcode(get_post()->post_content, 'product_comparator')) {
        wp_enqueue_style(
            'product-comparator-style',
            plugin_dir_url(__FILE__) . 'assets/css/style.css',
            [],
            '1.0.0'
        );

        wp_enqueue_script(
            'product-comparator-script',
            plugin_dir_url(__FILE__) . 'assets/js/main.js',
            ['jquery'], // Add jquery as a dependency
            '1.0.0',
            true
        );

        // Localize the script with new data
        wp_localize_script(
            'product-comparator-script',
            'comparator_ajax_object',
            [
                'ajax_url' => admin_url('admin-ajax.php'),
            ]
        );
    }
}
add_action('wp_enqueue_scripts', 'product_comparator_enqueue_assets');

/**
 * AJAX handler for getting product categories.
 */
function get_product_categories_ajax_handler()
{
    $categories = get_terms(['taxonomy' => 'product_cat', 'hide_empty' => false]);

    if (is_wp_error($categories)) {
        error_log('WordPress Error fetching categories: ' . $categories->get_error_message());
        wp_send_json_error('WordPress Error: ' . $categories->get_error_message());
    } elseif (empty($categories)) {
        error_log('No product categories found.');
        wp_send_json_error('No product categories found.');
    } else {
        $category_data = [];
        foreach ($categories as $category) {
            $thumbnail_id = get_term_meta($category->term_id, 'thumbnail_id', true);
            $image_url = $thumbnail_id ? wp_get_attachment_url($thumbnail_id) : ''; // Get URL or empty string

            $category_data[] = [
                'term_id' => $category->term_id,
                'name'    => $category->name,
                'slug'    => $category->slug,
                'image'   => $image_url,
            ];
        }
        wp_send_json_success($category_data);
    }
}
add_action('wp_ajax_get_product_categories', 'get_product_categories_ajax_handler');
add_action('wp_ajax_nopriv_get_product_categories', 'get_product_categories_ajax_handler');

/**
 * AJAX handler for getting product brands.
 */
function get_product_brands_ajax_handler()
{
    $brands = get_terms(['taxonomy' => 'product_brand', 'hide_empty' => false]);

    if (is_wp_error($brands)) {
        wp_send_json_error('WordPress Error: ' . $brands->get_error_message());
    } else {
        wp_send_json_success($brands);
    }
}
add_action('wp_ajax_get_product_brands', 'get_product_brands_ajax_handler');
add_action('wp_ajax_nopriv_get_product_brands', 'get_product_brands_ajax_handler');

/**
 * AJAX handler for getting products.
 */
function get_products_ajax_handler()
{
    $args = [
        'status' => 'publish',
        'limit' => -1, // Get all products
    ];

    // Search
    if (! empty($_POST['search'])) {
        $args['s'] = sanitize_text_field($_POST['search']);
    }

    // Category
    if (! empty($_POST['category'])) {
        $args['category'] = [sanitize_text_field($_POST['category'])];
    }

    // Brand
    if (! empty($_POST['brand'])) {
        $args['tax_query'][] = [
            'taxonomy' => 'product_brand',
            'field'    => 'slug',
            'terms'    => sanitize_text_field($_POST['brand']),
        ];
    }

    $products = wc_get_products($args);
    $product_data = [];

    foreach ($products as $product) {
        $product_data[] = [
            'id'    => $product->get_id(),
            'name'  => $product->get_name(),
            'image' => wp_get_attachment_url($product->get_image_id()),
        ];
    }

    wp_send_json_success($product_data);
}
add_action('wp_ajax_get_products', 'get_products_ajax_handler');
add_action('wp_ajax_nopriv_get_products', 'get_products_ajax_handler');

/**
 * AJAX handler for getting single product details.
 */
function get_product_details_ajax_handler()
{
    if (! isset($_POST['product_id'])) {
        wp_send_json_error('No product ID specified.');
    }

    $product_id = intval($_POST['product_id']);
    $product = wc_get_product($product_id);

    if (! $product) {
        wp_send_json_error('Product not found.');
    }

    $attributes = [];
    foreach ($product->get_attributes() as $attribute) {
        $attributes[] = [
            'name'  => wc_attribute_label($attribute->get_name()),
            'value' => $product->get_attribute($attribute->get_name()),
        ];
    }

    $product_data = [
        'id'         => $product->get_id(),
        'name'       => $product->get_name(),
        'image'      => wp_get_attachment_url($product->get_image_id()),
        'price'      => $product->get_price_html(),
        'attributes' => $attributes,
        'permalink'  => $product->get_permalink(),
        'description' => $product->get_description(),
    ];

    wp_send_json_success($product_data);
}
add_action('wp_ajax_get_product_details', 'get_product_details_ajax_handler');
add_action('wp_ajax_nopriv_get_product_details', 'get_product_details_ajax_handler');

/**
 * Shortcode handler
 */
function product_comparator_shortcode()
{
    // Fetch Sharp products for the initial carousel
    $sharp_products = wc_get_products([
        'status' => 'publish',
        'limit'  => -1,
        'tax_query' => [
            [
                'taxonomy' => 'product_brand',
                'field'    => 'slug',
                'terms'    => 'sharp',
            ],
        ],
    ]);

    // Get all category IDs from the Sharp products
    $sharp_category_ids = [];
    foreach ($sharp_products as $product) {
        $sharp_category_ids = array_merge($sharp_category_ids, $product->get_category_ids());
    }
    $sharp_category_ids = array_unique($sharp_category_ids);

    // Fetch only the product categories that contain Sharp products
    $product_categories = [];
    if (!empty($sharp_category_ids)) {
        $product_categories = get_terms([
            'taxonomy' => 'product_cat',
            'include'  => $sharp_category_ids,
            'hide_empty' => false, // We already know they're not empty of Sharp products
        ]);
    }

    ob_start();
?>
    <div class="pc-product-comparator-container">
        <div class="pc-comparator-header">
            <h2>Comparador de Productos</h2>
            <p class="pc-comparator-description">
                Selecciona un producto Sharp para iniciar. Luego, elige otros productos para ver una comparación detallada de sus características.
            </p>
        </div>

        <div id="comparator-products">
            <div id="pc-initial-step">
                <!-- Slot 1 for Sharp Product -->
                <div id="product-slot-1" class="pc-product-slot">
                    <div class="pc-product-content">
                        <p>Elige un producto</p>
                    </div>
                </div>

                <div id="pc-instructions-block" class="pc-instructions">
                    <h3>¿Cómo funciona?</h3>
                    <ul>
                        <li>
                            <span class="pc-step-number">1</span>
                            <p><strong>Elige un producto.</strong> Haz clic en "Añadir producto" para abrir el selector y encontrar un equipo</p>
                        </li>
                        <li>
                            <span class="pc-step-number">2</span>
                            <p><strong>Compara.</strong> Una vez seleccionado el primer equipo, aparecerá un nuevo espacio para que añadas otro producto y compares sus características.</p>
                        </li>
                        <li>
                            <span class="pc-step-number">3</span>
                            <p><strong>Decide.</strong> ¿Lo tienes claro? Pulsa en "Ver producto" para ir a su página y finalizar tu compra.</p>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Slot 2 for Any Product -->
            <div id="product-slot-2" class="pc-product-slot" style="display: none;">
                <div class="pc-product-content">
                    <p>Elige otro producto</p>
                </div>
            </div>

            <!-- Slot 3 for Any Product -->
            <div id="product-slot-3" class="pc-product-slot" style="display: none;">
                <div class="pc-product-content">
                    <p>Elige otro producto</p>
                </div>
            </div>
        </div>

        <!-- Sharp Products Carousel -->
        <div id="pc-sharp-carousel-wrapper">
            <!-- Category Pills -->
            <div class="pc-category-pills-container">
                <button class="pc-category-pill" data-category-slug="all">Todos</button>
                <?php if (!is_wp_error($product_categories) && !empty($product_categories)) : ?>
                    <?php foreach ($product_categories as $category) : ?>
                        <button class="pc-category-pill" data-category-slug="<?php echo esc_attr($category->slug); ?>">
                            <?php echo esc_html($category->name); ?>
                        </button>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>

            <div id="pc-sharp-carousel" style="display: none;">
                <?php foreach ($sharp_products as $product) : ?>
                    <?php
                    $category_slugs = wp_get_post_terms($product->get_id(), 'product_cat', ['fields' => 'slugs']);
                    $categories_string = implode(' ', $category_slugs);
                    ?>
                    <div class="pc-carousel-item" data-categories="<?php echo esc_attr($categories_string); ?>">
                        <img src="<?php echo wp_get_attachment_url($product->get_image_id()); ?>" alt="<?php echo $product->get_name(); ?>">
                        <h4><?php echo $product->get_name(); ?></h4>
                        <div class="pc-comparar-btn" data-id="<?php echo $product->get_id(); ?>">+</div>
                    </div>
                <?php endforeach; ?>
            </div>
            <button class="pc-carousel-nav pc-carousel-prev" style="display: none;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg></button>
            <button class="pc-carousel-nav pc-carousel-next" style="display: none;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg></button>
        </div>

        <div id="comparison-table" style="display: none;">
            <table>
                <thead>
                    <tr id="comparison-header">
                        <th>Característica</th>
                        <!-- Product names will be inserted here -->
                    </tr>
                </thead>
                <tbody id="comparison-body">
                    <!-- Attribute rows will be inserted here -->
                </tbody>
            </table>
        </div>
    </div>

    <!-- The Modal -->
    <div id="product-comparator-modal" class="pc-comparator-modal">
        <div class="pc-comparator-modal-content">
            <span class="pc-comparator-modal-close">&times;</span>

            <!-- Step 1: Category Selection -->
            <div id="modal-category-selection-view">
                <h3>Elige una categoría</h3>
                <div id="modal-category-list">
                    <!-- Category items will be loaded here via AJAX -->
                </div>
                <div class="pc-modal-footer-actions">
                    <button id="pc-see-all-products-btn" class="pc-link-btn">Ver todos los productos &rarr;</button>
                </div>
            </div>

            <!-- Step 2: Product Selection (Initially Hidden) -->
            <div id="modal-product-selection-view" style="display: none;">
                <div class="pc-modal-header">
                    <button id="pc-modal-back-btn" class="pc-secondary-btn">&larr; Volver a categorías</button>
                    <h3>Elige un producto</h3>
                </div>
                <div id="modal-filters">
                    <input type="text" id="modal-search-input" placeholder="Buscar productos...">
                    <div id="modal-selectors">
                        <select id="modal-category-selector"></select>
                        <select id="modal-brand-selector"></select>
                    </div>
                </div>
                <div id="modal-product-list">
                    <!-- Products will be loaded here via AJAX -->
                </div>
            </div>
        </div>
    </div>

    <div id="product-description-modal" class="pc-comparator-modal">
        <div class="pc-comparator-modal-content">
            <span class="pc-comparator-modal-close">&times;</span>
            <div id="modal-product-description">
                <!-- Product description will be loaded here -->
            </div>
        </div>
    </div>
<?php
    return ob_get_clean();
}
add_shortcode('product_comparator', 'product_comparator_shortcode');
