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
    const categorySelectionView = $('#modal-category-selection-view');
    const productSelectionView = $('#modal-product-selection-view');
    const categoryList = $('#modal-category-list');
    const descriptionModal = $('#product-description-modal');
    const productList = $('#modal-product-list');
    const categorySelector = $('#modal-category-selector');
    const brandSelector = $('#modal-brand-selector');
    const searchInput = $('#modal-search-input');
    const carouselWrapper = $('#pc-sharp-carousel-wrapper');

    // --- MODAL & DATA FETCHING ---

    function showCategoryView() {
        productSelectionView.hide();
        categorySelectionView.show();
        fetchCategories();
    }

    function showProductView(categorySlug = '') {
        categorySelectionView.hide();
        productSelectionView.show();
        
        // Fetch brands for the dropdown
        fetchBrands(); 
        
        // Fetch products, optionally filtered by the chosen category
        fetchProducts(categorySlug);

        // Pre-select the category in the dropdown if one was chosen
        // We need to fetch categories again for the dropdown
        $.ajax({
            url: comparator_ajax_object.ajax_url,
            type: 'POST',
            data: { action: 'get_product_categories' },
            success: function(response) {
                if (response.success) {
                    // Render categories in the dropdown
                    categorySelector.empty().append('<option value="">Todas las categorías</option>');
                    response.data.forEach(cat => {
                        categorySelector.append(`<option value="${cat.slug}">${cat.name}</option>`);
                    });
                    // Set the value
                    if (categorySlug) {
                        categorySelector.val(categorySlug);
                    }
                }
            }
        });
    }

    function openModal(slot) {
        currentSlot = slot;
        modal.show();
        showCategoryView();
    }

    function closeModal() {
        modal.hide();
        // Reset views and clear content
        productSelectionView.hide();
        categorySelectionView.show();
        productList.empty();
        categoryList.empty();
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
                    renderCategorySelection(response.data);
                } else {
                    console.error('Error fetching categories:', response.data);
                    categoryList.html('<p>Error al cargar categorías.</p>');
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('AJAX error fetching categories:', textStatus, errorThrown);
                categoryList.html('<p>Error al cargar categorías.</p>');
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

    function renderCategorySelection(categories) {
        categoryList.empty();
        if (categories.length === 0) {
            categoryList.html('<p>No se encontraron categorías.</p>');
            return;
        }
        categories.forEach(cat => {
            // Use a placeholder if the image is missing
            const imageUrl = cat.image || 'https://via.placeholder.com/150'; 
            const categoryEl = `
                <div class="pc-modal-category-item" data-slug="${cat.slug}">
                    <img src="${imageUrl}" alt="${cat.name}" class="pc-modal-category-image">
                    <span class="pc-modal-category-name">${cat.name}</span>
                </div>
            `;
            categoryList.append(categoryEl);
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
        const slotLabel = slot == 1 ? 'Elige un producto' : 'Elige otro producto';
        const originalHtml = `
            <div class="pc-product-content">
                <p>${slotLabel}</p>
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

    $('.pc-product-comparator-container').on('click', '.pc-product-slot:not(.pc-filled)', function() {
        const slot = $(this).attr('id').split('-')[2];
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
        const $this = $(this);
        const categorySlug = $this.data('category-slug');
        const carouselItems = carousel.find('.pc-carousel-item');

        // If the clicked pill is already active, deactivate it
        if ($this.hasClass('active')) {
            $this.removeClass('active');
            $('#pc-sharp-carousel, .pc-carousel-nav').fadeOut(200);
        } else {
            // Otherwise, activate the clicked pill
            $('#pc-sharp-carousel, .pc-carousel-nav').fadeIn(200);
            carouselWrapper.find('.pc-category-pill').removeClass('active');
            $this.addClass('active');

            // Filter items
            if (categorySlug === 'all') {
                carouselItems.fadeIn(200);
            } else {
                carouselItems.hide();
                carouselItems.filter(`[data-categories~="${categorySlug}"]`).fadeIn(200);
            }

            // Reset scroll and update nav arrows
            carousel.scrollLeft(0);
            setTimeout(function() {
                updateCarouselNav();
            }, 250);
        }
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

    // Main modal listeners
    $('.pc-comparator-modal-close').on('click', closeModal);
    $(window).on('click', function(event) {
        if ($(event.target).is(modal)) {
            closeModal();
        }
    });

    // Step 1: Category selection listeners
    $('#modal-category-list').on('click', '.pc-modal-category-item', function() {
        const categorySlug = $(this).data('slug');
        showProductView(categorySlug);
    });

    $('#pc-see-all-products-btn').on('click', function() {
        showProductView(); // Call without a category slug
    });

    // Step 2: Product selection listeners
    $('#pc-modal-back-btn').on('click', showCategoryView);

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