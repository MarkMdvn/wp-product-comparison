# Product Comparator WordPress Plugin

## 1. Project Overview

This project is a custom WordPress plugin designed to provide a product comparison tool for a WooCommerce-based website. The primary goal is to allow users to compare a featured product from the brand "Sharp" against any other product available in the store.

The plugin is self-contained and is initiated via a shortcode, `[product_comparator]`, which can be easily inserted into any page or post, including those built with Elementor.

## 2. Core Features

- **Shortcode Integration**: The entire comparator is rendered using the `[product_comparator]` shortcode.
- **Two-Product Comparison**: Users can compare two products side-by-side.
- **Guided Selection Process**:
  1. The user is first prompted to select a product from the "Sharp" brand.
  2. Once the first product is chosen, a second slot appears, allowing the user to select a product from any brand.
- **AJAX-Powered Product Selection Modal**:
  - A modal window is used for selecting products.
  - **Live Search**: Users can type to search for products by name.
  - **Category Filtering**: Users can click on category buttons to filter the product list.
- **Dynamic Comparison Table**:
  - After products are selected, a table is generated automatically.
  - The rows of the table are based on the product attributes of the *first* selected product (the Sharp product).
  - The table displays the attribute values for both products, allowing for a direct comparison.

## 3. Technical Implementation

### Plugin Structure

- **`product-comparator.php`**: The main plugin file. It handles:
  - Plugin registration (header).
  - Shortcode definition and rendering of the initial HTML structure.
  - Enqueuing of CSS and JavaScript assets.
  - Registration of all backend AJAX endpoints.
- **`assets/css/style.css`**: Contains all the styling for the comparator, product slots, modal, and comparison table.
- **`assets/js/main.js`**: The core of the frontend logic. It manages:
  - Opening and closing the product selection modal.
  - All communication with the backend via AJAX (using jQuery).
  - Fetching and rendering categories and products within the modal.
  - Handling user interactions (search, filtering, product selection).
  - Dynamically updating the UI and the comparison table based on user selections.

### Backend (AJAX Endpoints)

The plugin uses WordPress's built-in AJAX functionality (`admin-ajax.php`) to handle dynamic data requests without page reloads.

1.  **`get_product_categories`**: 
    - Fetches all WooCommerce product categories.
    - Used to populate the filter buttons in the modal.
2.  **`get_products`**: 
    - The main endpoint for finding products.
    - Accepts parameters for `brand`, `category`, and `search`.
    - Queries WooCommerce using `wc_get_products()` and returns a JSON list of simplified product data (ID, name, image).
3.  **`get_product_details`**: 
    - Fetches all relevant data for a single product ID.
    - Returns a JSON object with the product's name, image, price, and a list of its attributes.
    - This data is used to populate the product slots and the comparison table.

### How it Works (User Flow)

1.  Admin places `[product_comparator]` on a page.
2.  A user visits the page, and the initial HTML structure is loaded.
3.  The user clicks the "Añadir producto" button in the first slot.
4.  JavaScript opens the modal and makes two AJAX calls:
    - One to get all product categories for the filter buttons.
    - One to get all products of the 'Sharp' brand.
5.  The user can search or filter within the modal. Each interaction triggers a new AJAX call to `get_products` with the updated filters.
6.  The user clicks on a product in the modal.
7.  JavaScript makes an AJAX call to `get_product_details` to get all the data for the selected product.
8.  The modal closes. The selected product's information (image, name, price) is displayed in the first slot.
9.  The second product slot becomes visible.
10. The comparison table appears, showing the attributes and values of the first product.
11. The user can then click the button on the second slot, and the process repeats, but this time the AJAX call to `get_products` fetches items from *all* brands.
12. When the second product is selected, the comparison table is updated to include a new column for the second product, showing its corresponding attribute values.
