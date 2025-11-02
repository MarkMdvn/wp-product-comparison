<?php
/**
 * Plugin Name:       Product Comparator
 * Description:       A simple product comparator plugin for WooCommerce.
 * Version:           1.0.0
 * Author:            Gemini
 * Author URI:        https://gemini.google.com/
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       product-comparator
 * Domain Path:       /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

/**
 * Enqueue scripts and styles.
 */
function product_comparator_enqueue_assets() {
    // Make sure to enqueue only on pages where the shortcode is present
    if ( is_singular() && has_shortcode( get_post()->post_content, 'product_comparator' ) ) {
        wp_enqueue_style(
            'product-comparator-style',
            plugin_dir_url( __FILE__ ) . 'assets/css/style.css',
            [],
            '1.0.0'
        );

        wp_enqueue_script(
            'product-comparator-script',
            plugin_dir_url( __FILE__ ) . 'assets/js/main.js',
            ['jquery'], // Add jquery as a dependency
            '1.0.0',
            true
        );

        // Localize the script with new data
        wp_localize_script(
            'product-comparator-script',
            'comparator_ajax_object',
            [
                'ajax_url' => admin_url( 'admin-ajax.php' ),
            ]
        );
    }
}
add_action( 'wp_enqueue_scripts', 'product_comparator_enqueue_assets' );

/**
 * AJAX handler for getting product categories.
 */
function get_product_categories_ajax_handler() {
    $categories = get_terms( ['taxonomy' => 'product_cat', 'hide_empty' => true] );

    if ( is_wp_error( $categories ) ) {
        wp_send_json_error( 'WordPress Error: ' . $categories->get_error_message() );
    } elseif ( empty( $categories ) ) {
        wp_send_json_error( 'No product categories found.' );
    } else {
        wp_send_json_success( $categories );
    }
}
add_action( 'wp_ajax_get_product_categories', 'get_product_categories_ajax_handler' );
add_action( 'wp_ajax_nopriv_get_product_categories', 'get_product_categories_ajax_handler' );

/**
 * AJAX handler for getting products.
 */
function get_products_ajax_handler() {
    $args = [
        'status' => 'publish',
        'limit' => -1, // Get all products
    ];

    // Search
    if ( ! empty( $_POST['search'] ) ) {
        $args['s'] = sanitize_text_field( $_POST['search'] );
    }

    // Category
    if ( ! empty( $_POST['category'] ) ) {
        $args['category'] = [ sanitize_text_field( $_POST['category'] ) ];
    }

    // Brand
    if ( ! empty( $_POST['brand'] ) ) {
        $args['tax_query'][] = [
            'taxonomy' => 'product_brand',
            'field'    => 'slug',
            'terms'    => sanitize_text_field( $_POST['brand'] ),
        ];
    }

    $products = wc_get_products( $args );
    $product_data = [];

    foreach ( $products as $product ) {
        $product_data[] = [
            'id'    => $product->get_id(),
            'name'  => $product->get_name(),
            'image' => wp_get_attachment_url( $product->get_image_id() ),
        ];
    }

    wp_send_json_success( $product_data );
}
add_action( 'wp_ajax_get_products', 'get_products_ajax_handler' );
add_action( 'wp_ajax_nopriv_get_products', 'get_products_ajax_handler' );

/**
 * AJAX handler for getting single product details.
 */
function get_product_details_ajax_handler() {
    if ( ! isset( $_POST['product_id'] ) ) {
        wp_send_json_error( 'No product ID specified.' );
    }

    $product_id = intval( $_POST['product_id'] );
    $product = wc_get_product( $product_id );

    if ( ! $product ) {
        wp_send_json_error( 'Product not found.' );
    }

    $attributes = [];
    foreach ( $product->get_attributes() as $attribute ) {
        $attributes[] = [
            'name'  => wc_attribute_label( $attribute->get_name() ),
            'value' => $product->get_attribute( $attribute->get_name() ),
        ];
    }

    $product_data = [
        'id'         => $product->get_id(),
        'name'       => $product->get_name(),
        'image'      => wp_get_attachment_url( $product->get_image_id() ),
        'price'      => $product->get_price_html(),
        'attributes' => $attributes,
        'permalink'  => $product->get_permalink(),
    ];

    wp_send_json_success( $product_data );
}
add_action( 'wp_ajax_get_product_details', 'get_product_details_ajax_handler' );
add_action( 'wp_ajax_nopriv_get_product_details', 'get_product_details_ajax_handler' );

/**
 * Shortcode handler
 */
function product_comparator_shortcode() {
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

    ob_start();
    ?>
    <div class="pc-product-comparator-container">
        <h2>Comparador de Productos</h2>

        <div id="comparator-products">
            <!-- Slot 1 for Sharp Product -->
            <div id="product-slot-1" class="pc-product-slot">
                <div class="pc-product-content">
                    <p>Elige un producto Sharp</p>
                    <button class="pc-add-product-btn" data-slot="1">Añadir producto</button>
                </div>
            </div>

            <!-- Slot 2 for Any Product -->
            <div id="product-slot-2" class="pc-product-slot" style="display: none;">
                 <div class="pc-product-content">
                    <p>Elige otro producto</p>
                    <button class="pc-add-product-btn" data-slot="2">Añadir producto</button>
                </div>
            </div>
        </div>

        <!-- Sharp Products Carousel -->
        <div id="pc-sharp-carousel-wrapper">
            <div id="pc-sharp-carousel">
                <?php foreach ( $sharp_products as $product ) : ?>
                    <div class="pc-carousel-item">
                        <img src="<?php echo wp_get_attachment_url( $product->get_image_id() ); ?>" alt="<?php echo $product->get_name(); ?>">
                        <h4><?php echo $product->get_name(); ?></h4>
                        <button class="pc-comparar-btn" data-id="<?php echo $product->get_id(); ?>">Comparar</button>
                    </div>
                <?php endforeach; ?>
            </div>
            <button class="pc-carousel-nav pc-carousel-prev">&lt;</button>
            <button class="pc-carousel-nav pc-carousel-next">&gt;</button>
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
            <h3>Elige un producto</h3>
            <div id="modal-filters">
                <input type="text" id="modal-search-input" placeholder="Buscar productos...">
                <div id="modal-categories">
                    <!-- Category buttons will be loaded here -->
                </div>
            </div>
            <div id="modal-product-list">
                <!-- Products will be loaded here via AJAX -->
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode( 'product_comparator', 'product_comparator_shortcode' );
