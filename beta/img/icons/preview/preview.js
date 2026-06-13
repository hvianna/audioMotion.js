
$(document).ready(function() {

  var $page = $('.js-page');
  var $grid = $('.js-grid');
  var $icons = $('.js-icon');
  var $searchInput = $('.js-search-input');
  var $sectionTabs = $('.js-section-tabs');
  var $sizeTabs = $('.js-size-tabs');
  var $togglePreviewChars = $('.js-toggle-preview-chars');
  var $toggleEditor = $('.js-toggle-editor');
  var $popupWrapper = $('.js-popup-wrapper');
  var $popup = $('.js-popup');
  var $dimmer = $('.js-dimmer');
  var $popupClose = $('.js-popup-close');
  var $fontSizeInput = $('.js-font-size-input');
  var $editor = $('.js-editor');
  var $fontFamilySelector = $('.js-font-family-selector');
  var $textarea = $('.js-textarea');
  var $cheatcodeInputs = $('.js-cheatcode');

  $('.js-tabs').each(function () { initTabs(this); });
  $searchInput.on('keyup', onSearch);
  $sizeTabs.on('tabClick', onSizeTabClick);
  $sectionTabs.on('tabClick', onSectionTabClick);
  $togglePreviewChars.on('click', onTogglePreviewCharsClick);
  $toggleEditor.on('click', onToggleEditorClick);
  $grid.on('click', '.js-icon', onIconClick);
  $popupClose.on('click', onPopupClose);
  $dimmer.on('click', onPopupClose);
  $page.on('click', '.js-usage-example-link', onUsageExampleClick);
  $fontSizeInput.on('change', onFontSizeChanged);
  $fontFamilySelector.on('change', onFontFamilyChanged);
  $cheatcodeInputs
      .on('mouseup', onCheatcodeFocus)
      .on('click', onCheatcodeFocus)
      .on('focus', onCheatcodeFocus);

  function onSearch(e) {
    var term = e.target.value.trim();

    if (!term.length) {
      $icons.show();
      return;
    }

    var nameRegex = new RegExp(term, 'i');

    $icons
      .hide()
      .filter(function () { return nameRegex.test(this.getAttribute('data-name')) })
      .filter(function () { return nameRegex.test(this.getAttribute('data-name')) })
      .show()
    ;
  }

  function initTabs(el) {
    var $tabs = $(el);
    var $tab;
    $tabs.on('click', function (e) {
      if (e.target.parentElement !== el || $tabs.hasClass('m-inactive')) return;
      $tab = $(e.target);
      $tab.addClass('m-active').siblings('.m-active').removeClass('m-active');
      $tabs.trigger('tabClick', $tab.data('value'));
    });
  }

  function onSizeTabClick(e, size) {
    $grid.attr('data-size', size);
  }

  function onSectionTabClick(e, mode) {
    $sizeTabs.toggleClass('m-inactive', mode !== 'grid');
    $grid.attr('data-mode', mode);
    $togglePreviewChars.parent().toggleClass('m-inactive', mode == 'cheatsheet');
  }

  function onTogglePreviewCharsClick() {
    if ($(this).parent().hasClass('m-inactive'))
        return;
    $togglePreviewChars.toggleClass('m-active');
    $page.toggleClass('m-preview-characters');
  }

  function onToggleEditorClick() {
    $toggleEditor.toggleClass('m-active');
    $editor.toggleClass('m-active');
  }

  function onIconClick(e) {
    var $icon = $(e.currentTarget);
    var gridMode = $icon.parents('.js-grid').data('mode');
    if ('grid' == gridMode)
      openPopup($icon[0].outerHTML);
  }

  function openPopup(html) {
    $popupWrapper.addClass('m-active');
    setTimeout(function () { $popup.html(html); });
  }

  function onPopupClose() {
    $popupWrapper.removeClass('m-active');
    $popup.html('');
  }

  function onUsageExampleClick(e) {
    var example = $(e.currentTarget).data('example');
    openPopup($('.js-usage-example[data-example="' + example + '"]').html());
  }

  function onFontSizeChanged(e) {
    var val = e.target.value.trim();
    if(val.indexOf('px')==-1 && val.indexOf('em')==-1 && val.indexOf('%')==-1 && val.indexOf('rem')==-1)
      val += 'px';
    $textarea.css("font-size", val);
  }

  function onFontFamilyChanged(e) {
    var val = e.target.value.trim();
    $textarea.css("font-family", "audioMotion, " + val);
  }

  function onCheatcodeFocus(e) {
    e.preventDefault();
    var t = $(this);
    setTimeout(function() {
      t.select();
    }, 150);
  }
});
