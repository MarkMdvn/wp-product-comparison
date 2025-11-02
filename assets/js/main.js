jQuery(document).ready(function($) {
    console.log('Product Comparator JS Loaded');

    // --- STATE MANAGEMENT ---
    let currentSlot = 1;
    let selectedProducts = {
        1: null,
        2: null,
        3: null,
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

        // Show the next empty slot if it exists
        const nextSlot = parseInt(slot) + 1;
        if (nextSlot <= 3) {
             $(`#product-slot-${nextSlot}`).show();
        }
    }

    function unrenderSelectedProduct(slot) {
        const slotEl = $(`#product-slot-${slot}`);
        const slotLabel = slot == 1 ? 'un producto Sharp' : 'otro producto';
        const originalHtml = `
            <div class="pc-product-content">
                <p>Elige ${slotLabel}</p>
                <button class="pc-add-product-btn">Añadir producto</button>
            </div>
        `;
        slotEl.removeClass('pc-filled').html(originalHtml);
    }

    function removeProduct(slotToRemove) {
        // When a product is removed, clear it and all subsequent products
        for (let i = slotToRemove; i <= 3; i++) {
            if (selectedProducts[i]) {
                selectedProducts[i] = null;
                unrenderSelectedProduct(i);
                // Hide the slot unless it's the one immediately after the last filled one
                if (i > 1 && !selectedProducts[i-1]) {
                     $(`#product-slot-${i}`).hide();
                }
            }
        }

        // Special handling for slot 1 removal
        if (slotToRemove == 1) {
            $('#pc-sharp-carousel-wrapper').show(); // Show the carousel again
            for (let i = 2; i <= 3; i++) {
                 $(`#product-slot-${i}`).hide();
            }
        }
        
        // Ensure the next empty slot is visible
        const activeProducts = Object.values(selectedProducts).filter(p => p !== null);
        const nextEmptySlot = activeProducts.length + 1;
        if (nextEmptySlot <= 3) {
            $(`#product-slot-${nextEmptySlot}`).show();
        }

        updateComparisonTable();
    }

    function updateComparisonTable() {
        const tableHeader = $('#comparison-header');
        const tableBody = $('#comparison-body');
        const p1 = selectedProducts[1];

        const activeProducts = Object.values(selectedProducts).filter(p => p !== null);

        if (activeProducts.length === 0) {
            $('#comparison-table').hide();
            return;
        }

        $('#comparison-table').show();
        tableBody.empty();
        
        // --- Headers ---
        tableHeader.html(`<th>Característica</th>`);
        activeProducts.forEach(product => {
            const header_html = `
                <th>
                    <div class="pc-header-product-info">
                        <img src="${product.image || ''}" alt="${product.name}">
                        <span>${product.name}</span>
                    </div>
                </th>
            `;
            tableHeader.append(header_html);
        });

        // --- Body Rows (based on product 1's attributes) ---
        if (p1) {
            p1.attributes.forEach(attr => {
                let row = `<tr><td><strong>${attr.name}</strong></td>`;
                activeProducts.forEach(product => {
                    const matchingAttr = product.attributes.find(a => a.name === attr.name);
                    const attrValue = matchingAttr ? matchingAttr.value : '-';
                    row += `<td>${attrValue}</td>`;
                });
                row += '</tr>';
                tableBody.append(row);
            });

            // --- Footer Row for Buttons ---
            let footerRow = '<tr><td></td>';
            activeProducts.forEach(product => {
                 footerRow += `<td><a href="${product.permalink}" target="_blank" class="pc-view-product-btn">Ver producto</a></td>`;
            });
            footerRow += '</tr>';
            tableBody.append(footerRow);
        }
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