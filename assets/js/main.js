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
    const descriptionModal = $('#product-description-modal');
    const productList = $('#modal-product-list');
    const categorySelector = $('#modal-category-selector');
    const brandSelector = $('#modal-brand-selector');
    const searchInput = $('#modal-search-input');
    const carouselWrapper = $('#pc-sharp-carousel-wrapper');

    // --- MODAL & DATA FETCHING ---

    function openModal(slot) {
        currentSlot = slot;
        modal.show();
        fetchCategories();
        fetchBrands();
        fetchProducts();
    }

    function closeModal() {
        modal.hide();
        productList.empty();
        categorySelector.empty();
        brandSelector.empty();
        searchInput.val('');
    }

    function openDescriptionModal(description) {
        const modalContent = descriptionModal.find('#modal-product-description');
        modalContent.html(description);
        descriptionModal.show();
    }

    function closeDescriptionModal() {
        descriptionModal.hide();
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

    function fetchBrands() {
        $.ajax({
            url: comparator_ajax_object.ajax_url,
            type: 'POST',
            data: { action: 'get_product_brands' },
            success: function(response) {
                if (response.success) {
                    renderBrands(response.data);
                } else {
                    console.error('Error fetching brands:', response.data);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('AJAX error fetching brands:', textStatus, errorThrown);
            }
        });
    }

    function fetchProducts(category = '', search = '', brand = '') {
        const fetchBrand = (currentSlot == 1) ? 'sharp' : brand;

        $.ajax({
            url: comparator_ajax_object.ajax_url,
            type: 'POST',
            data: {
                action: 'get_products',
                brand: fetchBrand,
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

                    // If the first product was just selected, update the layout
                    if (currentSlot == 1) {
                        $('#pc-sharp-carousel-wrapper').hide();
                        $('#comparator-products').addClass('pc-selection-started');
                    }
                }
            }
        });
    }

    // --- CAROUSEL UX ---
    const carousel = $('#pc-sharp-carousel');

    function updateCarouselNav() {
        const scrollLeft = carousel.scrollLeft();
        const scrollWidth = carousel[0].scrollWidth;
        const width = carousel.width();

        // Previous button
        if (scrollLeft > 0) {
            $('.pc-carousel-prev').removeClass('disabled');
        } else {
            $('.pc-carousel-prev').addClass('disabled');
        }

        // Next button
        if (scrollLeft + width < scrollWidth - 1) { // -1 for pixel rounding errors
            $('.pc-carousel-next').removeClass('disabled');
        } else {
            $('.pc-carousel-next').addClass('disabled');
        }
    }

    // --- RENDERING ---

    function renderCategories(categories) {
        categorySelector.empty().append('<option value="">Todas las categorías</option>');
        categories.forEach(cat => {
            categorySelector.append(`<option value="${cat.slug}">${cat.name}</option>`);
        });
    }

    function renderBrands(brands) {
        brandSelector.empty().append('<option value="">Todas las marcas</option>');
        brands.forEach(brand => {
            brandSelector.append(`<option value="${brand.slug}">${brand.name}</option>`);
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
                <button class="pc-know-more-btn" data-slot="${slot}">Saber más</button>
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
            $('#comparator-products').removeClass('pc-selection-started');
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
        tableHeader.html(`<th><img src="https://comparador-sharp.epoint.es/wp-content/uploads/2025/10/cropped-cropped-Sharp-logo-e1761660317500.png" alt="Sharp Logo" style="max-width: 100px;"></th>`);
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

    // --- Carousel Listeners ---
    $('#pc-sharp-carousel-wrapper').on('click', '.pc-comparar-btn', function() {
        const productId = $(this).data('id');
        currentSlot = 1; // Ensure we are filling the first slot
        selectProduct(productId);
    });

    const scrollAmount = carousel.width() * 0.8; // Scroll by 80% of the container width
    $('.pc-carousel-next').on('click', function() {
        if (!$(this).hasClass('disabled')) {
            carousel.animate({ scrollLeft: '+=' + scrollAmount }, 400);
        }
    });

    $('.pc-carousel-prev').on('click', function() {
        if (!$(this).hasClass('disabled')) {
            carousel.animate({ scrollLeft: '-=' + scrollAmount }, 400);
        }
    });

    carousel.on('scroll', function() {
        updateCarouselNav();
    });

    // --- Category Pill Filtering ---
    carouselWrapper.on('click', '.pc-category-pill', function(e) {
        e.preventDefault();
        const categorySlug = $(this).data('category-slug');

        // Update active pill
        carouselWrapper.find('.pc-category-pill').removeClass('active');
        $(this).addClass('active');

        // Filter items
        const carouselItems = carousel.find('.pc-carousel-item');
        if (categorySlug === 'all') {
            carouselItems.fadeIn(200);
        } else {
            carouselItems.hide();
            carouselItems.filter(`[data-categories~="${categorySlug}"]`).fadeIn(200);
        }

        // Reset scroll and update nav arrows
        carousel.scrollLeft(0);
        // Use a timeout to wait for the fade-in to complete before updating nav
        setTimeout(function() {
            updateCarouselNav();
        }, 250);
    });

    $('.pc-product-comparator-container').on('click', '.pc-know-more-btn', function() {
        const slot = $(this).data('slot');
        const product = selectedProducts[slot];
        if (product && product.description) {
            openDescriptionModal(product.description);
        }
    });

    // --- Modal Listeners ---
    $('#product-description-modal .pc-comparator-modal-close').on('click', closeDescriptionModal);
    $(window).on('click', function(event) {
        if ($(event.target).is(descriptionModal)) {
            closeDescriptionModal();
        }
    });

    $('.pc-comparator-modal-close').on('click', closeModal);
    $(window).on('click', function(event) {
        if ($(event.target).is(modal)) {
            closeModal();
        }
    });

    searchInput.on('keyup', function() {
        const search = $(this).val();
        const category = categorySelector.val() || '';
        const brand = brandSelector.val() || '';
        fetchProducts(category, search, brand);
    });

    categorySelector.on('change', function() {
        const category = $(this).val();
        const search = searchInput.val();
        const brand = brandSelector.val() || '';
        fetchProducts(category, search, brand);
    });

    brandSelector.on('change', function() {
        const brand = $(this).val();
        const category = categorySelector.val() || '';
        const search = searchInput.val();
        fetchProducts(category, search, brand);
    });

    productList.on('click', '.pc-modal-product-item', function() {
        const productId = $(this).data('id');
        selectProduct(productId);
    });

    // Initial setup
    updateCarouselNav();
});