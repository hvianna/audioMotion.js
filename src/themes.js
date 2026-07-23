/**
 * Color theme definitions
 */
const THEMES = {
	apple:  	  { name: 'Apple ][',
					colorStops: [
						{ pos: .1667, color: '#61bb46' },
						{ pos: .3333, color: '#fdb827' },
						{ pos: .5, color: '#f5821f' },
						{ pos: .6667, color: '#e03a3e' },
						{ pos: .8333, color: '#963d97' },
						{ pos: 1, color: '#009ddc' }
					],
					disabled: false },

	aurora:   	  { name: 'Aurora',
					bgColor: '#0e172a',
					colorStops: [
						{ pos: .1, color: 'hsl( 120, 100%, 50% )' },
						{ pos:  1, color: 'hsl( 216, 100%, 50% )' }
					],
					disabled: false },

	borealis:     { name: 'Borealis',
					bgColor: '#0d1526',
					colorStops: [
						{ pos: .1, color: 'hsl( 120, 100%, 50% )' },
						{ pos: .5, color: 'hsl( 189, 100%, 40% )' },
						{ pos:  1, color: 'hsl( 290, 60%, 40% )' }
					],
					disabled: false },

	candy:  	  { name: 'Candy',
					bgColor: '#0d0619',
					colorStops: [
						{ pos: .1, color: '#ffaf7b' },
						{ pos: .5, color: '#d76d77' },
						{ pos: 1, color: '#3a1c71' }
					],
					disabled: false },

	classic: 	  { name: 'Classic', disabled: false },

	cool:   	  { name: 'Cool',
					bgColor: '#0b202b',
					colorStops: [
						'hsl( 208, 0%, 100% )',
						'hsl( 208, 100%, 35% )'
					],
					disabled: false },

	dusk:   	  { name: 'Dusk',
					bgColor: '#0e172a',
					colorStops: [
						{ pos: .2, color: 'hsl( 55, 100%, 50% )' },
						{ pos:  1, color: 'hsl( 16, 100%, 50% )' }
					],
					disabled: false },

	miami: 		  { name: 'Miami',
					bgColor: '#110a11',
					colorStops: [
						{ pos: .024, color: 'rgb( 251, 198, 6 )' },
						{ pos: .283, color: 'rgb( 224, 82, 95 )' },
						{ pos: .462, color: 'rgb( 194, 78, 154 )' },
						{ pos: .794, color: 'rgb( 32, 173, 190 )' },
						{ pos: 1, color: 'rgb( 22, 158, 95 )' }
					],
					disabled: false },

	mono: 		  { name: 'Mono (BETA!)',
					colorStops: [ '#eee' ],
					peakColor: 'red',
					disabled: false },

	orient: 	  { name: 'Orient',
					bgColor: '#100',
					colorStops: [
						{ pos: .1, color: '#f00' },
						{ pos: 1, color: '#600' }
					],
					disabled: false },

	outrun: 	  { name: 'Outrun',
					bgColor: '#101',
					colorStops: [
						{ pos: 0, color: 'rgb( 255, 223, 67 )' },
						{ pos: .182, color: 'rgb( 250, 84, 118 )' },
						{ pos: .364, color: 'rgb( 198, 59, 243 )' },
						{ pos: .525, color: 'rgb( 133, 80, 255 )' },
						{ pos: .688, color: 'rgb( 74, 104, 247 )' },
						{ pos: 1, color: 'rgb( 35, 210, 255 )' }
					],
					disabled: false },

	pacific:  	  { name: 'Pacific Dream',
					bgColor: '#051319',
					colorStops: [
						{ pos: .1, color: '#34e89e' },
						{ pos: 1, color: '#0f3443' }
					],
					disabled: false },

	prism:  	  { name: 'Prism', disabled: false },

	prism_old: 	  { name: 'Prism (legacy)',
					colorStops: [
						'hsl( 0, 100%, 50% )',
						'hsl( 60, 100%, 50% )',
						'hsl( 120, 100%, 50% )',
						'hsl( 180, 100%, 50% )',
						'hsl( 240, 100%, 50% )'
					],
					disabled: true },

	rainbow:  	  { name: 'Rainbow', horizontal: true, disabled: false },

	rainbow_old:  { name: 'Rainbow (legacy)',
					horizontal: true,
					colorStops: [
						'hsl( 0, 100%, 50% )',
						'hsl( 60, 100%, 50% )',
						'hsl( 120, 100%, 50% )',
						'hsl( 180, 100%, 47% )',
						'hsl( 240, 100%, 58% )',
						'hsl( 300, 100%, 50% )',
						'hsl( 360, 100%, 50% )'
					],
					disabled: true },

	shahabi:  	  { name: 'Shahabi',
					bgColor: '#060613',
					colorStops: [
						{ pos: .1, color: '#66ff00' },
						{ pos: 1, color: '#a80077' }
					],
					disabled: false },

	summer: 	  { name: 'Summer',
					bgColor: '#041919',
					colorStops: [
						{ pos: .1, color: '#fdbb2d' },
						{ pos: 1, color: '#22c1c3' }
					],
					disabled: false },

	sunset: 	  { name: 'Sunset',
					bgColor: '#021119',
					colorStops: [
						{ pos: .1, color: '#f56217' },
						{ pos: 1, color: '#0b486b' }
					],
					disabled: false },

	tiedye: 	  { name: 'Tie Dye',
					colorStops: [
						{ pos: .038, color: 'rgb( 15, 209, 165 )' },
						{ pos: .208, color: 'rgb( 15, 157, 209 )' },
						{ pos: .519, color: 'rgb( 133, 13, 230 )' },
						{ pos: .731, color: 'rgb( 230, 13, 202 )' },
						{ pos: .941, color: 'rgb( 242, 180, 107 )' }
					],
					disabled: false }
};

export default THEMES;
