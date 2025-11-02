jQuery(document).ready(function($) {
    console.log('Product Comparator JS Loaded');

    // --- STATE MANAGEMENT ---
    let currentSlot = 1;
    let selectedProducts = {
        1: null,
        2: null,
    };

    // --- DOM ELEMENTS ---
    const modal = $('#product-comparator-modal');
    const productList = $('#modal-product-list');
    const categoryContainer = $('#modal-categories');
    const searchInput = $('#modal-search-input');

    // --- MODAL & DATA FETCHING ---

    function openModal(slot) {
        currentSlot = slot;
        modal.show();
        fetchCategories();
        fetchProducts();
    }

    function closeModal() {
        modal.hide();
        productList.empty();
        categoryContainer.empty();
        searchInput.val('');
    }

    function fetchCategories() {
        $.ajax({
            url: comparator_ajax_object.ajax_url,
            type: 'POST',
            data: { action: 'get_product_categories' },
            success: function(response) {
                if (response.success) {
                    renderCategories(response.data);
                }
            }
        });
    }

    function fetchProducts(category = '', search = '') {
        const brand = (currentSlot == 1) ? 'Sharp' : ''; // 'Sharp' name for slot 1

        $.ajax({
            url: comparator_ajax_object.ajax_url,
            type: 'POST',
            data: {
                action: 'get_products',
                brand: brand,
                category: category,
                search: search
            },
            beforeSend: function() {
                productList.html('Cargando...');
            },
            success: function(response) {
                if (response.success) {
                    renderProducts(response.data);
                }
            }
        });
    }

    function selectProduct(productId) {
        $.ajax({
            url: comparator_ajax_object.ajax_url,
            type: 'POST',
            data: { 
                action: 'get_product_details', 
                product_id: productId 
            },
            success: function(response) {
                if (response.success) {
                    selectedProducts[currentSlot] = response.data;
                    renderSelectedProduct(currentSlot);
                    updateComparisonTable();
                    closeModal();
                }
            }
        });
    }

    // --- RENDERING ---

    function renderCategories(categories) {
        categoryContainer.empty().append('<button class="category-filter-btn active" data-slug="">Todas</button>');
        categories.forEach(cat => {
            categoryContainer.append(`<button class="category-filter-btn" data-slug="${cat.slug}">${cat.name}</button>`);
        });
    }

    function renderProducts(products) {
        productList.empty();
        if (products.length === 0) {
            productList.html('No se encontraron productos.');
            return;
        }
        products.forEach(product => {
            const productEl = `
                <div class="modal-product-item" data-id="${product.id}">
                    <img src="${product.image || ''}" alt="${product.name}">
                    <p>${product.name}</p>
                </div>
            `;
            productList.append(productEl);
        });
    }

    function renderSelectedProduct(slot) {
        const product = selectedProducts[slot];
        const slotEl = $(`#product-slot-${slot}`);
        
        if (!product) return;

        const productHtml = `
            <div class="product-details">
                <img src="${product.image || ''}" alt="${product.name}">
                <h4>${product.name}</h4>
                <p>${product.price}</p>
            </div>
        `;
        slotEl.addClass('filled').find('.product-content').html(productHtml);

        // Show next slot if first is filled
        if (slot == 1) {
            $('#product-slot-2').show();
        }
    }

    function updateComparisonTable() {
        const tableHeader = $('#comparison-header');
        const tableBody = $('#comparison-body');
        const p1 = selectedProducts[1];
        const p2 = selectedProducts[2];

        if (!p1) return;

        $('#comparison-table').show();
        tableBody.empty();
        
        // --- Headers ---
        tableHeader.html(`<th>Característica</th>`);
        tableHeader.append(`<th>${p1.name}</th>`);
        if (p2) {
            tableHeader.append(`<th>${p2.name}</th>`);
        }

        // --- Body Rows (based on product 1's attributes) ---
        p1.attributes.forEach(attr => {
            const p2_attr = p2 ? p2.attributes.find(a => a.name === attr.name) : null;
            const p2_value = p2_attr ? p2_attr.value : '-';
            
            const row = `
                <tr>
                    <td><strong>${attr.name}</strong></td>
                    <td>${attr.value}</td>
                    ${p2 ? `<td>${p2_value}</td>` : ''}
                </tr>
            `;
            tableBody.append(row);
        });
    }


    // --- EVENT LISTENERS ---

    // Need to use .on() for dynamically added elements, but since this button is always there, this is fine.
    $('.product-comparator-container').on('click', '.add-product-btn', function() {
        const slot = $(this).closest('.product-slot').attr('id').split('-')[2];
        openModal(slot);
    });

    $('.comparator-modal-close').on('click', closeModal);
    $(window).on('click', function(event) {
        if ($(event.target).is(modal)) {
            closeModal();
        }
    });

    searchInput.on('keyup', function() {
        const search = $(this).val();
        const category = categoryContainer.find('.active').data('slug') || '';
        fetchProducts(category, search);
    });

    categoryContainer.on('click', '.category-filter-btn', function() {
        $(this).addClass('active').siblings().removeClass('active');
        const category = $(this).data('slug');
        const search = searchInput.val();
        fetchProducts(category, search);
    });

    productList.on('click', '.modal-product-item', function() {
        const productId = $(this).data('id');
        selectProduct(productId);
    });

});