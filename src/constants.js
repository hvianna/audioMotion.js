/**
 * CONSTANTS
 */

import * as _am from 'audiomotion-analyzer';

export const AUTOHIDE_DELAY        = 500,				// delay for triggering front panel auto-collapse (in milliseconds)
			 BG_DIRECTORY          = 'backgrounds/', 	// server folder name for built-in backgrounds (must end with a slash!)
			 MAX_METADATA_REQUESTS = 4,				// max concurrent metadata requests
			 MAX_QUEUED_SONGS      = 2000,
			 NEXT_TRACK            = -1;				// for loadSong()

// Server configuration filename
export const SERVERCFG_FILE = 'config.yaml';

// Background option values
export const BG_DEFAULT = '0',
			 BG_BLACK   = '1',
			 BG_COVER   = '2',
			 BG_IMAGE   = '3',
			 BG_VIDEO   = '4',
			 DEFAULT_BG_COLOR = '#111111'; // for themes with no `bgColor` property; must be a full hex string for color picker compatibility

// Backgrounds folder options
export const BGFOLDER_NONE   = '0',
			 BGFOLDER_SERVER = '1',
			 BGFOLDER_LOCAL  = '2';

// Background image fit option values
export const BGFIT_ADJUST   = '0',
			 BGFIT_CENTER   = '1',
			 BGFIT_REPEAT   = '2',
			 BGFIT_PULSE    = '3',
			 BGFIT_ZOOM_IN  = '4',
			 BGFIT_ZOOM_OUT = '5',
			 BGFIT_WARP     = '6',
			 BGFIT_WARP_ANI = '7',
			 BGFIT_WARP_ROT = '8';

// CSS classes
export const CSS_CLASS_COMPACT   = 'compact',
			 CSS_CLASS_DISABLED  = 'disabled',
			 CSS_CLASS_FIT_VIDEO = 'fit-video',
			 CSS_CLASS_NO_IMAGE  = 'no-image',
			 CSS_CLASS_PRESERVE_FILENAMES = 'preserve-filenames',
			 CSS_CLASS_SHORTCUT  = 'custom-shortcut',
			 CSS_CLASS_WARNING   = 'warning';

// Dataset template for play queue items and audio elements
export const DATASET_TEMPLATE = {
	album: '',
	artist: '',
	codec: '',
	cover: '',
	duration: '',
	file: '',
	filename: '',
	quality: '',
	title: ''
};

// Error codes
export const ERR_ABORT = 20; // AbortError

// Recognized file extensions
export const FILE_EXT_AUDIO = ['mp3','flac','m4a','aac','ogg','wav'],
			 FILE_EXT_IMAGE = ['jpg','jpeg','webp','avif','png','gif','bmp'],
			 FILE_EXT_PLIST = ['m3u','m3u8'],
			 FILE_EXT_VIDEO = ['mkv','mpg','webm','mp4','avi','mov'];

// File mode access options
export const FILEMODE_SERVER = 'server',
			 FILEMODE_LOCAL  = 'local';

// Limit values for frequency range selection
export const FREQ_LO_MIN = 1,
			 FREQ_LO_MAX = 2000,
			 FREQ_HI_MIN = 1000,
			 FREQ_HI_MAX = 24000;

// localStorage keys
export const KEY_CONFIGURATION  = 'audioMotion-config',
			 KEY_CUSTOM_THEMES  = 'audioMotion-themes',
			 KEY_CUSTOM_PRESETS = 'audioMotion-presets',
			 KEY_KBD_SHORTCUTS  = 'audioMotion-shortcuts',
			 KEY_LAST_SESSION   = 'audioMotion-session',
			 KEY_FORCE_FS_API   = 'force-filesystem';

// legacy localStorage keys (consolidated into `audioMotion-config` entry, except for grads and presets)
export const KEY_LEGACY_CUSTOM_GRADS   = 'custom-grads',
			 KEY_LEGACY_CUSTOM_PRESETS = 'custom-preset',
			 KEY_LEGACY_DISABLED_BGFIT = 'disabled-bgfit',
			 KEY_LEGACY_DISABLED_GRADS = 'disabled-gradients',
			 KEY_LEGACY_DISABLED_PROPS = 'disabled-properties',
			 KEY_LEGACY_DISPLAY_OPTS   = 'display-options',
			 KEY_LEGACY_GENERAL_OPTS   = 'general-settings',
			 KEY_LEGACY_LAST_CONFIG    = 'last-config',
			 KEY_LEGACY_LAST_VERSION   = 'last-version',
			 KEY_LEGACY_PEAK_OPTIONS   = 'peak-settings',
			 KEY_LEGACY_SENSITIVITY    = 'sensitivity-presets',
			 KEY_LEGACY_SUBTITLES_OPTS = 'subtitles-settings';

// indexedDB data keys
export const KEY_DB_BGDIR_HANDLE = 'bgDir',
			 KEY_DB_LAST_DIR     = 'last-dir', // also used in localStorage for webserver mode
			 KEY_DB_PLAYLISTS    = 'playlists',
			 KEY_DB_PLAYQUEUE    = 'playqueue',
			 PLAYLIST_PREFIX     = 'pl_';

// Options for LED format
export const LEDFORMAT_REGULAR = 0,
			 LEDFORMAT_THIN    = 1,
			 LEDFORMAT_SQUARE  = 2;

// LED properties for each bandCount (for Regular format)
export const LEDPROPS = {
	[ _am.BANDS_FFT ]: [],
	[ _am.BANDS_OCTAVE_FULL ]: [ 9, 3 ],
	[ _am.BANDS_OCTAVE_HALF ]: [ 9, 3 ],
	[ _am.BANDS_OCTAVE_3RD  ]: [ 9, 3 ],
	[ _am.BANDS_OCTAVE_4TH  ]: [ 8, 3 ],
	[ _am.BANDS_OCTAVE_6TH  ]: [ 8, 3 ],
	[ _am.BANDS_OCTAVE_8TH  ]: [ 6, 3 ],
	[ _am.BANDS_OCTAVE_12TH ]: [ 6, 3 ],
	[ _am.BANDS_OCTAVE_24TH ]: [ 4, 2 ]
};

// Legacy visualization modes (for preset migration)
export const LEGACY_MODE_BARS     = '11',
			 LEGACY_MODE_DISCRETE = '0',
			 LEGACY_MODE_GRAPH    = '10',
			 LEGACY_MODE_LINE     = '101';

// Options for OSD font size and style
export const OSD_SIZE_S = '0',
			 OSD_SIZE_M = '1',
			 OSD_SIZE_L = '2',
			 OSD_STYLE_OUTLINE = '0',
			 OSD_STYLE_SHADOW  = '1';

// Valid values for the `frontPanel` URL parameter and config.yaml option
export const PANEL_CLOSE = 'close',
			 PANEL_OPEN  = 'open';

// Keynames for "special" built-in presets
export const PRESET_KEY_DEFAULT      = 'defaults',
			 PRESET_KEY_DEMO         = 'demo',     // triggers randomizeNow() when loaded
			 PRESET_KEY_LAST_SESSION = 'last';

// User presets placeholders
export const PRESET_EMPTY  = 'Empty slot',
			 PRESET_NONAME = 'No description';

// Property keys for Randomize settings
export const RND_ALPHA      = 'alpha',
			 RND_BACKGROUND = 'nobg',
			 RND_BANDCOUNT  = 'bands',
			 RND_BGIMAGEFIT = 'imgfit',
			 RND_COLORMODE  = 'colormode',
			 RND_HORIZONTAL = 'horizontal',
			 RND_LEDS       = 'leds',
			 RND_LED_FORMAT = 'ledformat',
			 RND_LED_MASK   = 'ledmask',
			 RND_MODE       = 'mode',
			 RND_OUTLINE    = 'outline',
			 RND_PEAKS      = 'peaks',
			 RND_PRESETS    = 'presets',
			 RND_RADIAL     = 'radial',
			 RND_REFLEX     = 'reflex',
			 RND_REVERSE    = 'reverse',
			 RND_ROUND      = 'round',
			 RND_SPLIT      = 'split',
			 RND_THEMES     = 'gradient',
			 MIN_STREAK_FOR_GRAPH  = 3,
			 MIN_STREAK_FOR_RADIAL = 5;

// Subtitles settings options
export const SUBS_BG_NONE      = 'none',
			 SUBS_BG_SHADOW    = 'shadow',
			 SUBS_BG_SOLID     = 'solid',
			 SUBS_COLOR_GOLD   = 'gold',
			 SUBS_COLOR_GRAY   = 'gray',
			 SUBS_COLOR_WHITE  = 'white',
			 SUBS_COLOR_YELLOW = 'yellow',
			 SUBS_CSS_BG       = 'subs-bg-', // CSS class prefix
			 SUBS_CSS_COLOR    = 'subs-color-',
			 SUBS_POS_BOTTOM   = 'bottom',
			 SUBS_POS_CENTER   = 'center',
			 SUBS_POS_TOP      = 'top';

// Keynames for UI controls, for shortcut assignment in config.yaml
export const UI_ALPHABARS    = 'alpha_bars',
			 UI_ANALYZERMODE = 'analyzer_mode',
			 UI_BACKGROUND   = 'background',
			 UI_BANDCOUNT    = 'band_count',
			 UI_BARSPACING   = 'bar_spacing',
			 UI_BGDIM        = 'background_dim',
			 UI_BGFIT        = 'background_fit',
			 UI_COLORMODE    = 'color_mode',
			 UI_FILLOPACITY  = 'fill_opacity',
			 UI_FPS          = 'fps',
			 UI_FREQSCALE    = 'freq_scale',
			 UI_FULLSCREEN   = 'fullscreen',
			 UI_HORIZONTAL0  = 'horizontal',
			 UI_HORIZONTAL1  = 'horizontal_right',
			 UI_LABELSX      = 'x_labels',
			 UI_LABELSY      = 'y_labels',
			 UI_LAYOUT       = 'channel_layout',
			 UI_LEDBARS      = 'led_bars',
			 UI_LEDFORMAT    = 'led_format',
			 UI_LEDMASK      = 'led_mask',
			 UI_LEVELSCALE   = 'level_scale',
			 UI_LINEWIDTH    = 'line_width',
			 UI_LORES        = 'lores',
			 UI_MIRROR       = 'mirror',
			 UI_OSD          = 'display_info',
			 UI_OUTLINE      = 'outline_bars',
			 UI_PEAKS        = 'peaks',
			 UI_RADIAL       = 'radial',
			 UI_RADIALSIZE   = 'radial_size',
			 UI_RADIALSPIN   = 'radial_spin',
			 UI_RANDOMIZE    = 'randomize',
			 UI_REFLEX       = 'reflex',
			 UI_REPEAT       = 'repeat',
			 UI_REVERSE0     = 'reverse',
			 UI_REVERSE1     = 'reverse_right',
			 UI_ROUNDBARS    = 'round_bars',
			 UI_SENSITIVITY  = 'sensitivity',
			 UI_SHUFFLE      = 'shuffle',
			 UI_SUBTITLES    = 'toggle_subs',
			 UI_THEME0       = 'theme',
			 UI_THEME1       = 'theme_right',
			 UI_TRACKINFO    = 'track_info',
			 UI_WEIGHTING    = 'weighting';

// Update banner settings
export const UPDATE_BANNER_TIMEOUT = 10000,  // time visible (milliseconds)
			 UPDATE_SHOW_CSS_CLASS = 'show'; // active CSS class
