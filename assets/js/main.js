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
                } else {
                    console.error('Error fetching categories:', response.data);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('AJAX error fetching categories:', textStatus, errorThrown);
            }
        });
    }

    function fetchProducts(category = '', search = '') {
        const brand = (currentSlot == 1) ? 'sharp' : ''; // 'sharp' slug for slot 1

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
        categoryContainer.empty().append('<button class="pc-category-filter-btn active" data-slug="">Todos</button>');
        categories.forEach(cat => {
            categoryContainer.append(`<button class="pc-category-filter-btn" data-slug="${cat.slug}">${cat.name}</button>`);
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
                <div class="pc-modal-product-item" data-id="${product.id}">
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
            <button class="pc-remove-product-btn" data-slot="${slot}">&times;</button>
            <div class="pc-product-details">
                <img src="${product.image || ''}" alt="${product.name}">
                <h4>${product.name}</h4>
                <p>${product.price}</p>
            </div>
        `;
        slotEl.addClass('pc-filled').find('.pc-product-content').html(productHtml);

        // Show next slot if first is filled
        if (slot == 1) {
            $('#product-slot-2').show();
        }
    }

    function unrenderSelectedProduct(slot) {
        const slotEl = $(`#product-slot-${slot}`);
        const originalHtml = `
            <div class="pc-product-content">
                <p>Elige un producto ${slot == 1 ? 'Sharp' : ''}</p>
                <button class="pc-add-product-btn">Añadir producto</button>
            </div>
        `;
        slotEl.removeClass('pc-filled').html(originalHtml);
    }

    function removeProduct(slot) {
        selectedProducts[slot] = null;
        unrenderSelectedProduct(slot);

        // If we remove product 1, we must also remove product 2
        if (slot == 1) {
            selectedProducts[2] = null;
            unrenderSelectedProduct(2);
            $('#product-slot-2').hide();
            $('#comparison-table').hide();
            $('#pc-sharp-carousel-wrapper').show(); // Show the carousel again
        }

        updateComparisonTable();
    }

    function updateComparisonTable() {
        const tableHeader = $('#comparison-header');
        const tableBody = $('#comparison-body');
        const p1 = selectedProducts[1];
        const p2 = selectedProducts[2];

        if (!p1) {
            $('#comparison-table').hide();
            return;
        }

        $('#comparison-table').show();
        tableBody.empty();
        
        // --- Headers ---
        tableHeader.html(`<th>Característica</th>`);
        const p1_header = `
            <th>
                <div class="pc-header-product-info">
                    <img src="${p1.image || ''}" alt="${p1.name}">
                    <span>${p1.name}</span>
                </div>
            </th>
        `;
        tableHeader.append(p1_header);

        if (p2) {
            const p2_header = `
                <th>
                    <div class="pc-header-product-info">
                        <img src="${p2.image || ''}" alt="${p2.name}">
                        <span>${p2.name}</span>
                    </div>
                </th>
            `;
            tableHeader.append(p2_header);
        } else {
            // Ensure the table structure is correct even with one product
            tableHeader.find('th').eq(2).remove(); 
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

        // --- Footer Row for Buttons ---
        let footerRow = '<tr><td></td>'; // Empty cell for the attribute column
        footerRow += `<td><a href="${p1.permalink}" target="_blank" class="pc-view-product-btn">Ver producto</a></td>`;
        if (p2) {
            footerRow += `<td><a href="${p2.permalink}" target="_blank" class="pc-view-product-btn">Ver producto</a></td>`;
        }
        footerRow += '</tr>';
        tableBody.append(footerRow);
    }


    // --- EVENT LISTENERS ---

    $('.pc-product-comparator-container').on('click', '.pc-add-product-btn', function() {
        const slot = $(this).closest('.pc-product-slot').attr('id').split('-')[2];
        openModal(slot);
    });

    $('.pc-product-comparator-container').on('click', '.pc-remove-product-btn', function() {
        const slot = $(this).data('slot');
        removeProduct(slot);
    });

    // Carousel button listener
    $('#pc-sharp-carousel-wrapper').on('click', '.pc-comparar-btn', function() {
        const productId = $(this).data('id');
        currentSlot = 1; // Ensure we are filling the first slot
        selectProduct(productId);
        $('#pc-sharp-carousel-wrapper').hide();
    });

    // Carousel navigation
    const carousel = $('#pc-sharp-carousel');
    const itemWidth = 220; // Assuming item width + gap
    $('.pc-carousel-next').on('click', function() {
        carousel.animate({ scrollLeft: '+=' + itemWidth * 2 }, 400);
    });

    $('.pc-carousel-prev').on('click', function() {
        carousel.animate({ scrollLeft: '-=' + itemWidth * 2 }, 400);
    });

    $('.pc-comparator-modal-close').on('click', closeModal);
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

    categoryContainer.on('click', '.pc-category-filter-btn', function() {
        $(this).addClass('active').siblings().removeClass('active');
        const category = $(this).data('slug');
        const search = searchInput.val();
        fetchProducts(category, search);
    });

    productList.on('click', '.pc-modal-product-item', function() {
        const productId = $(this).data('id');
        selectProduct(productId);
    });

});