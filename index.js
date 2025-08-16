import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "My-SillyTavern-Stories";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// ---【雲端伺服器配置】---
const SERVER_IP = "1.92.112.106"; 
const SECRET_KEY = "qweasd123"; 
// ----------------------

const SERVER_URL = `http://${SERVER_IP}`;
const UPLOAD_API_URL = `${SERVER_URL}/api/upload`;

const defaultSettings = {
    enabled: true,
    boundWorldBook: null,
};

// ============================================================================
// ====================== 【不變的核心函數和雲端邏輯】 ========================
// ============================================================================

async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    Object.assign(extension_settings[extensionName], { ...defaultSettings, ...extension_settings[extensionName] });
    $("#enable_story_library").prop("checked", extension_settings[extensionName].enabled);
}

function onEnableChange() {
    extension_settings[extensionName].enabled = $("#enable_story_library").prop("checked");
    saveSettingsDebounced();
    updateToolbarButton();
}

function updateToolbarButton() {
    $("#story_library_toolbar").toggle(extension_settings[extensionName].enabled);
}

function closeLibraryModal() { $("#story_library_modal_overlay").remove(); }
function closeUploadModal() { $("#story_upload_modal_overlay").remove(); }
function closeLocalLibraryModal() { $("#story_local_library_modal_overlay").remove(); }

async function sendTextDirectly(text) {
    if (!text) return;
    if (typeof window.triggerSlash === 'function') { await window.triggerSlash(text); return; }
    if (window.parent && typeof window.parent.triggerSlash === 'function') { await window.parent.triggerSlash(text); return; }
    const sendButton = $('#send_but'), inputTextArea = $('#send_textarea');
    if (sendButton.length > 0 && inputTextArea.length > 0) {
        const originalText = inputTextArea.val();
        inputTextArea.val(text);
        inputTextArea[0].dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => { 
            sendButton.click();
            inputTextArea.val(''); 
            inputTextArea[0].dispatchEvent(new Event('input', { bubbles: true }));
        }, 100); 
    }
}

async function openUploadModal() {
    if ($("#story_upload_modal_overlay").length > 0) return;
    const uploadHtml = await $.get(`${extensionFolderPath}/upload.html`);
    $("body").append(uploadHtml);
    $("#story_upload_close_btn").on("click", closeUploadModal);
    $("#submit_upload_btn").on("click", async () => {
        const payload = { title: $("#upload_title").val(), author: $("#upload_author").val(), tags: $("#upload_tags").val().split(',').map(t => t.trim()).filter(Boolean), content: $("#upload_content").val(), secret: SECRET_KEY, };
        if (!payload.title || !payload.content) { $("#upload_status").text("錯誤：標題和內容不能為空！").css('color', 'red'); return; }
        $("#upload_status").text("上傳中...").css('color', '');
        try {
            const response = await fetch(UPLOAD_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (result.success) {
                $("#upload_status").text("上傳成功！窗口將在2秒後關閉。").css('color', 'lightgreen');
                setTimeout(() => { closeUploadModal(); closeLibraryModal(); openLibraryModal(); }, 2000);
            } else { $("#upload_status").text(`錯誤: ${result.message}`).css('color', 'red'); }
        } catch (error) { console.error("上傳失敗:", error); $("#upload_status").text("錯誤：無法連接到API伺服器。").css('color', 'red'); }
    });
}

async function openLibraryModal() {
    if ($("#story_library_modal_overlay").length > 0) return;
    const modalHtml = await $.get(`${extensionFolderPath}/library.html`);
    $("body").append(modalHtml);
    let allStories = [], currentStory = null;
    const INDEX_PATH = `${SERVER_URL}/index.json`, STORIES_BASE_PATH = `${SERVER_URL}/stories/`;
    function displayStoryContent() { if (!currentStory) return; $("#library_story_title").text(currentStory.title); $("#library_story_meta").html(`<span>作者: ${currentStory.author}</span> | <span>標籤: ${currentStory.tags.join(', ')}</span>`); $("#library_story_content").text(currentStory.content); $("#library_actions").show(); }
    async function loadStory(storyId) { try { const response = await fetch(`${STORIES_BASE_PATH}${storyId}.json`); if (!response.ok) throw new Error('Network response was not ok.'); currentStory = await response.json(); displayStoryContent(); } catch (error) { console.error("小劇場庫: 加載劇本文件失敗", error); $("#library_story_content").text('加載劇本內容失敗。'); } }
    function renderStoryList(stories) { const listContainer = $("#library_story_list_container").empty(); if (stories.length === 0) { listContainer.append('<p>沒有找到匹配的劇本。</p>'); return; } stories.forEach(story => { const item = $('<div class="library-story-item"></div>').text(story.title); item.on('click', function() { $(".library-story-item.active").removeClass('active'); $(this).addClass('active'); loadStory(story.id); }); listContainer.append(item); }); }
    function handleSearchAndFilter() { const searchTerm = $("#story_search_input").val().toLowerCase(); const activeTag = $(".library-tag-btn.active").data('tag'); let filteredStories = allStories; if (activeTag !== 'all' && activeTag) { filteredStories = filteredStories.filter(s => s.tags.includes(activeTag)); } if (searchTerm) { filteredStories = filteredStories.filter(s => s.title.toLowerCase().includes(searchTerm)); } renderStoryList(filteredStories); }
    function renderTags() { const tagContainer = $("#library_tag_container").empty(); const tags = new Set(['all', ...allStories.flatMap(story => story.tags)]); tags.forEach(tag => { const btn = $('<button class="library-tag-btn"></button>').data('tag', tag).text(tag === 'all' ? '全部' : tag); if (tag === 'all') btn.addClass('active'); btn.on('click', function() { $(".library-tag-btn.active").removeClass('active'); $(this).addClass('active'); handleSearchAndFilter(); }); tagContainer.append(btn); }); }
    async function initStoryLibrary() { try { const response = await fetch(INDEX_PATH + '?t=' + new Date().getTime()); if (!response.ok) throw new Error('Network response was not ok.'); allStories = await response.json(); renderTags(); handleSearchAndFilter(); } catch (error) { console.error("小劇場庫: 加載 index.json 失敗!", error); $("#library_tag_container").html(`<p>加載索引失敗。</p>`); } }
    $("#story_library_close_btn").on("click", closeLibraryModal);
    $("#story_library_modal_overlay").on("click", function(event) { if (event.target === this) closeLibraryModal(); });
    $("#story_search_input").on('input', handleSearchAndFilter);
    $("#open_upload_modal_btn").on("click", openUploadModal);
    $("#library_send_btn").on("click", () => { if (currentStory) { sendTextDirectly(currentStory.content); closeLibraryModal(); } });
    $("#open_local_library_btn").on("click", openLocalLibraryModal);
    initStoryLibrary();
}

// ============================================================================
// ==================== 【遵從您範例的、全新的本地庫邏輯】 ====================
// ============================================================================

async function openLocalLibraryModal() {
    // 【核心修正】將API檢查移到函數頂部
    if (typeof getLorebooks !== 'function' || typeof getLorebookEntries !== 'function' || typeof setLorebookEntries !== 'function') {
        if (typeof toastr === 'object' && typeof toastr.error === 'function') {
            toastr.error('無法使用本地劇場庫功能。', '錯誤: 酒館助手API未找到');
        } else {
            alert("錯誤：酒館助手API未找到。無法使用本地劇場庫功能。");
        }
        return;
    }
    
    if ($("#story_local_library_modal_overlay").length > 0) return;
    const modalHtml = await $.get(`${extensionFolderPath}/local_library.html`);
    $("body").append(modalHtml);
    $("#story_local_library_close_btn").on("click", closeLocalLibraryModal);

    const bookSelector = $("#worldbook_selector");
    const storyListContainer = $("#local_story_list_container");
    const newStoryIdDisplay = $("#new_local_story_id_display");
    let localStories = [];

    async function renderWorldBookSelector() {
        try {
            const books = await getLorebooks();
            bookSelector.empty().append('<option value="">-- 請選擇 --</option>');
            books.forEach(book => {
                const option = $(`<option></option>`).val(book).text(book);
                if (book === extension_settings[extensionName].boundWorldBook) {
                    option.prop('selected', true);
                }
                bookSelector.append(option);
            });
        } catch (error) { console.error("加載世界書列表失敗:", error); bookSelector.empty().append('<option value="">加載失敗</option>'); }
    }

    function parseAndRenderLocalStories(entries) {
        storyListContainer.empty();
        localStories = [];
        let storyCount = 0;
        entries.forEach(entry => {
            const content = entry.content || "";
            const regex = /<id>(\d+)\.<\/id>([\s\S]*?)(?=<id>\d+\.<\/id>|$)/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                storyCount++;
                const id = parseInt(match[1]);
                const storyText = match[2].trim();
                localStories.push({ id, text: storyText, entryUid: entry.uid });
                const snippet = storyText.substring(0, 30) + (storyText.length > 30 ? '...' : '');
                const item = $(`<div class="local-story-item"><div class="local-story-header"><span>#${id}: ${snippet}</span><span>▼</span></div><div class="local-story-content"><div class="local-story-content-text">${storyText}</div><div class="local-story-actions"><button class="menu_button send-local-story-btn">發送</button></div></div></div>`);
                item.find('.local-story-header').on('click', function() { $(this).siblings('.local-story-content').slideToggle(200); });
                item.find('.send-local-story-btn').on('click', function() { sendTextDirectly(storyText); closeLocalLibraryModal(); });
                storyListContainer.append(item);
            }
        });
        if (storyCount === 0) { storyListContainer.html('<p>未在此世界書的“小劇場庫”條目中找到格式正確的劇本。<br>格式: <id>1.</id>劇本內容...</p>'); }
        updateNewStoryId();
    }

    async function loadLocalStories() {
        const bookName = extension_settings[extensionName].boundWorldBook;
        if (!bookName) { storyListContainer.html('<p>請先綁定一個世界書。</p>'); return; }
        storyListContainer.html('<p>正在加載劇本...</p>');
        try {
            const entries = await getLorebookEntries(bookName, { filter: { comment: "小劇場庫" } });
            if (!entries || entries.length === 0) { storyListContainer.html(`<p>在世界書“${bookName}”中未找到註釋為“小劇場庫”的條目。</p>`); return; }
            parseAndRenderLocalStories(entries);
        } catch (error) { console.error("加載本地劇本失敗:", error); storyListContainer.html('<p>加載劇本時發生錯誤。</p>'); }
    }

    function updateNewStoryId() {
        const maxId = localStories.reduce((max, story) => Math.max(max, story.id), 0);
        const nextId = maxId + 1;
        newStoryIdDisplay.text(`下一個可用編號: ${nextId}`);
        return nextId;
    }
    
    async function saveAndSendNewLocalStory() {
        const bookName = extension_settings[extensionName].boundWorldBook;
        if (!bookName) { alert("請先綁定世界書！"); return; }
        const newContent = $("#new_local_story_content").val().trim();
        if (!newContent) { alert("新劇本內容不能為空！"); return; }
        try {
            const entries = await getLorebookEntries(bookName, { filter: { comment: "小劇場庫" } });
            if (!entries || entries.length === 0) { alert(`錯誤：在“${bookName}”中找不到“小劇場庫”條目來保存新劇本。`); return; }
            const targetEntry = entries[0];
            const nextId = updateNewStoryId();
            const newStoryString = `\n<id>${nextId}.</id>${newContent}`;
            const updatedContent = (targetEntry.content || "") + newStoryString;
            await setLorebookEntries(bookName, [{ uid: targetEntry.uid, content: updatedContent }]);
            await sendTextDirectly(newContent);
            closeLocalLibraryModal();
        } catch (error) { console.error("保存新劇本失敗:", error); alert("保存新劇本時發生錯誤。"); }
    }

    $("#bind_worldbook_btn").on("click", () => {
        const selectedBook = bookSelector.val();
        if (selectedBook) { extension_settings[extensionName].boundWorldBook = selectedBook; saveSettingsDebounced(); loadLocalStories(); }
    });
    $("#save_and_send_local_story_btn").on("click", saveAndSendNewLocalStory);

    await renderWorldBookSelector();
    if (extension_settings[extensionName].boundWorldBook) { await loadLocalStories(); }
}

// ============================================================================
// ========================== 【插件主入口（最終修正）】 ==========================
// ============================================================================
jQuery(async () => {
    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
        $("#extensions_settings2").append(settingsHtml);
        const toolbarHtml = await $.get(`${extensionFolderPath}/toolbar.html`);
        if ($("#qr--bar").length === 0) { $("#send_form").append('<div class="flex-container flexGap5" id="qr--bar"></div>'); }
        $(toolbarHtml).insertAfter("#qr--bar");

        // 【核心修正】我們不在這裡直接綁定點擊事件，而是等待一切就緒
        // $("#open_library_btn").on("click", openLibraryModal);

        await loadSettings();
        updateToolbarButton();
        
        // 【核心修正】模仿您的範例，使用延時和多重檢查來確保所有API都已就緒
        function ensureUIAreReady() {
            // 檢查按鈕是否已注入，如果沒有，重新注入並綁定
            if ($("#open_story_library_btn").length === 0) {
                // 這是一個備用方案，正常情況下不應該執行
                const toolbarHtml = `<div id="story_library_toolbar" class="qr--buttons qr--color" data-mobile-safe="true"><button id="open_story_library_btn" class="qr--button menu_button interactable" title="打開小劇場庫" data-norefocus="true">📚 劇場</button></div>`;
                $(toolbarHtml).insertAfter("#qr--bar");
            }
            // 只綁定一次事件
            $("#open_story_library_btn").off('click').on('click', openLibraryModal);
            $("#enable_story_library").off('input').on('input', onEnableChange);
        }
        
        setTimeout(ensureUIAreReady, 1000); // 給予1秒的充足時間讓其他插件加載
        $(window).on('load', () => setTimeout(ensureUIAreReady, 500));
        if(typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
            SillyTavern.getContext().then(() => setTimeout(ensureUIAreReady, 500));
        }


    } catch (error) {
        console.error(`加載插件【${extensionName}】時發生嚴重錯誤:`, error);
    }
});
