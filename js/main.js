'use strict';

var useLocalStorage = (typeof localStorage !== 'undefined');

/**
 * if true, allows placing any card in the Flower slot, and dragons are always movable.
 * @type {Boolean}
 */
var DEBUG = getUrlParameters('debug')==='true';

/**
 * Time in milliseconds cards take moving around
 * @type {Number}
 */
var CARD_ANIMATION_SPEED = 250;

/**
 * Gap in pixels between cards when fanned out.
 * @type {Number}
 */
var CARD_STACK_GAP = 30;

/**
 * The seed of the game being played right now.
 */
var currentSeed;

var THEME = getUrlParameters('theme');

var bambooWhiteToGreen = 'sepia(100%) saturate(10000%) hue-rotate(63deg) brightness(.35)';

var SUITS = {
	BAMBOO: {
		order: 1,
		color: '#17714e',
		prefix_large: 'bamboo',
		small: 'bamboo',
		fixAssetsFilter: bambooWhiteToGreen, // apply a color the the bamboo/green-dragon images since they changed to white.
	},
	CHARACTERS: {
		order: 2,
		color: '#000000',
		prefix_large: 'char',
		small: 'characters'
	},
	COINS: {
		order: 3,
		color: '#ae2810',
		prefix_large: 'coins',
		small: 'coins'
	}
};

var SPECIAL = {
	DRAGON_GREEN: {
		order: 1,
		large: 'dragon_green',
		small: 'dragon_green',
		equivalentSuit: 'bamboo',
		fixAssetsFilter: bambooWhiteToGreen, // apply a color the the bamboo/green-dragon images since they changed to white.
	},
	DRAGON_RED: {
		order: 2,
		large: 'dragon_red',
		small: 'dragon_red',
		equivalentSuit: 'coins',
	},
	DRAGON_WHITE: {
		order: 3,
		large: 'dragon_white',
		small: 'dragon_white',
		equivalentSuit: 'characters',
	},
	FLOWER: {
		order: 4,
		large: 'flower',
		small: 'flower',
		equivalentSuit: 'flower',
	}
};

/**
 * Number of each type of dragon to create.
 * @type {Number}
 */
var DRAGON_COUNT = 4;

/**
 * Height in px of the tray slots.
 * @type {Number}
 */
var SLOT_TALL = 500;

function createSLOTS() {
	var SLOTS = {
		SPARE: [],
		FLOWER: [],
		OUT: [],
		TRAY: []
	};
	for (var i = 0; i < 3; i++) {
		SLOTS.SPARE.push({
			type: 'spare',
			top: 18,
			left: 46 + 152 * i
		});
	}
	SLOTS.FLOWER.push({
		type: 'flower',
		fan: "revert",
		top: 18,
		left: 614
	});
	for (var i = 0; i < 3; i++) {
		SLOTS.OUT.push({
			type: 'out',
			top: 18,
			left: 806 + 152 * i
		});
	}
	for (var i = 0; i < 8; i++) {
		SLOTS.TRAY.push({
			type: 'tray',
			fan: "normal",
			top: 282,
			left: 46 + 152 * i,
			height: SLOT_TALL
		});
	}
	return SLOTS;
}

/**
 * Contains groupings of slots, which will have an "element" property added.
 * @type {Object}
 */
var SLOTS = createSLOTS();

// Audio element for OST
var music = null;

jQuery.fn.visible = function () {
	return this.css('visibility', 'visible');
};

jQuery.fn.invisible = function () {
	return this.css('visibility', 'hidden');
};

jQuery.fn.visibilityToggle = function () {
	return this.css('visibility', function (i, visibility) {
		return (visibility == 'visible') ? 'hidden' : 'visible';
	});
};

/**
 * Creates a card of the given value and suit.
 * @param  {Integer} value
 * @param  {SUIT} suit 
 * @return {Card} {element: HTMLElement, value: Integer, suit: SUIT}
 */
function createCard(value, suit) {
	var smallImg = THEME+'/small_icons/' + suit.small + '.png';
	var largeImg = THEME+'/large_icons/' + suit.prefix_large + '_' + value + '.png';
	var card = $('<div class="card card-numbered nickardson card-' + suit.small + ' card-' + value + '">' +
		'<div class="card-count-a"></div>' +
		'<div class="card-count-b"></div>' +
		'<div class="card-mini-logo-a"></div>' +
		'<div class="card-mini-logo-b"></div>' +
		'<div class="card-logo"></div>' +
		'</div>');

	card.css('color', suit.color);
	card.find('.card-count-a,.card-count-b').text(value);
	card.find('.card-mini-logo-a,.card-mini-logo-b')
		.css({
			'background-image': 'url(' + smallImg + ')',
			'filter': suit.fixAssetsFilter
		});
	card.find('.card-logo')
		.css({
			'background-image': 'url(' + largeImg + ')',
			'filter': suit.fixAssetsFilter
		});

	var c = {
		element: card,
		value: value,
		suit: suit
	};
	card.data('card', c);
	return c;
}

/**
 * Creates a 'special' card of the given type.
 * @param  {SPECIAL} special Card type definitition from the SPECIAL table.
 * @return {Card}
 */
function createSpecialCard(special) {
	var smallImg = THEME+'/small_icons/' + special.small + '.png';
	var largeImg = THEME+'/large_icons/' + special.large + '.png';
	var card = $('<div class="card card-special card-' + special.equivalentSuit + '">' +
		'<div class="card-logo-a"></div>' +
		'<div class="card-logo-b"></div>' +
		'<div class="card-logo"></div>' +
		'</div>');

	card.find('.card-logo-a,.card-logo-b')
		.css({
			'background-image': 'url(' + smallImg + ')',
			'filter': special.fixAssetsFilter
		});
	card.find('.card-logo')
		.css({
			'background-image': 'url(' + largeImg + ')',
			'filter': special.fixAssetsFilter
		});

	var c = {
		element: card,
		special: special
	};
	card.data('card', c);
	return c;
}

/**
 * Places a card at the given level on the given slot.
 * @param {Card} card  The card to place.
 * @param {Subslot} slot  The destination slot
 * @param {Integer} depth How high up the card is. Higher values are further up the stack. When fanned out, higher values are displayed closer to the bottom.
 */
function insertCard(card, slot, depth) {
	if (card.slot !== undefined) {
		card.slot.cards.splice(card.slot.cards.indexOf(card), 1); // remove the card from the previous slot
	}
	// add the card to a new slot.
	slot.cards.splice(depth, 0, card);
	card.slot = slot;

	var e = $(slot.element);

	var ce = card.element.detach();
	if (depth === 0) {
		e.prepend(ce);
	} else {
		var target = e.find('.card:nth-child(' + depth + ')');
		if (target.length !== 0) {
			target.after(ce);
		} else {
			e.append(ce);
		}
	}

	var h = 0;
	if(slot.fan === "revert") {
		h = depth * -1;
	} else if (slot.fan === "normal") {
		h = depth * CARD_STACK_GAP;
	}
	card.element.css({
		'top': h + 'px',
		'left': 0
	});
}

/**
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 * @param {Array[?]} array Array to shuffle in-place
 */
function shuffleArray(array) {
	for (var i = array.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
}

/**
 * Creates the elements for the slots, and prepares them to accept cards.
 * @param  {SLOTS} slots The SLOTS object, a set of arrays, each containing slots.
 * @param  {HTMLElement} board The element slots are parented to.
 */
function populateSlots(slots, board) {
	// Create the slots
	for (var slotname in slots) {
		if (slots.hasOwnProperty(slotname)) {
			var list = slots[slotname];
			for (var i = 0; i < list.length; i++) {
				var slot = $('<div class="slot"></div>').css({
					top: list[i].top,
					left: list[i].left
				}).addClass('slot-' + list[i].type);
				if (list[i].height !== undefined) {
					slot.css('height', list[i].height);
				}
				slot.appendTo(board);
				list[i].cards = [];
				list[i].element = slot;
				slot.data('slot', list[i]);
			}
		}
	}
}

/**
 * Creates all the cards in a full deck.
 * @return {Array[Card]} 
 */
function makeDeck() {
	var cards = [];
	var suits = [SUITS.BAMBOO, SUITS.CHARACTERS, SUITS.COINS];
	for (var value = 1; value <= 9; value++) {
		for (var s = 0; s < 3; s++) {
			cards.push(createCard(value, suits[s]));
		}
	}

	suits = [SPECIAL.DRAGON_GREEN, SPECIAL.DRAGON_WHITE, SPECIAL.DRAGON_RED];
	for (s = 0; s < 3; s++) {
		for (var i = 0; i < DRAGON_COUNT; i++) {
			cards.push(createSpecialCard(suits[s]));
		}
	}

	cards.push(createSpecialCard(SPECIAL.FLOWER));
	return cards;
}

/**
 * Makes sure there are no vertical gaps between cards in the tray, by moving them towards the top to fill the gap.
 */
function balanceCards() {
	for (var i = 0; i < SLOTS.TRAY.length; i++) {
		for (var y = 0; y < SLOTS.TRAY[i].cards.length; y++) {
			insertCard(SLOTS.TRAY[i].cards[y], SLOTS.TRAY[i], y);
		}
	}
}

/**
 * Gets all special cards of the given type.
 * @param  {SPECIAL} type
 * @return {Array[Card]}
 */
function getSpecialCards(type) {
	var list = [];
	for (var slotName in SLOTS) {
		if (SLOTS.hasOwnProperty(slotName)) {
			for (var i = 0; i < SLOTS[slotName].length; i++) {
				var stack = SLOTS[slotName][i].cards;
				for (var j = 0; j < stack.length; j++) {
					var card = stack[j];
					if (card.special == type) {
						list.push(card);
					}
				}
			}
		}
	}

	return list;
}

/**
 * Gets all special cards of the given type which are on the top of their respective stack.
 * @param  {SPECIAL} type
 * @return {Array[Card]}
 */
function getTopSpecialCards(type) {
	var list = [];
	for (var slotName in SLOTS) {
		if (SLOTS.hasOwnProperty(slotName)) {
			for (var i = 0; i < SLOTS[slotName].length; i++) {
				var stack = SLOTS[slotName][i].cards;
				if (stack.length === 0) {
					continue;
				}
				var card = stack[stack.length - 1];
				if (card.special == type) {
					list.push(card);
				}
			}
		}
	}

	return list;
}

/**
 * Gets the card with the given value and suit, if any.
 * @param  {Integer} value Card value
 * @param  {SUIT} suit  Card suit
 * @return {Card}       The found card, or undefined.
 */
function getCard(value, suit) {
	for (var slotName in SLOTS) {
		if (SLOTS.hasOwnProperty(slotName)) {
			for (var i = 0; i < SLOTS[slotName].length; i++) {
				var stack = SLOTS[slotName][i].cards;
				for (var j = 0; j < stack.length; j++) {
					if (stack[j].value === value && stack[j].suit == suit) {
						return stack[j];
					}
				}
			}
		}
	}
}

/**
 * Gets whether the dragons of the given type are all on the top of their respective stack, and a slot is open for them to go to.
 * @param  {SPECIAL}  type 
 * @return {Boolean}  Whether all dragon cards of that type are able to be moved, and there is an open slot.
 */
function isDragonReady(type) {
	if (DEBUG === true) {
		return true;
	}

	var allAvailable = getTopSpecialCards(type).length == DRAGON_COUNT;
	var spaceOpen = false;

	for (var i = 0; i < SLOTS.SPARE.length; i++) {
		if (SLOTS.SPARE[i].cards.length === 0 || SLOTS.SPARE[i].cards[0].special === type) {
			spaceOpen = true;
		}
	}

	return allAvailable && spaceOpen;
}

var DRAGON_BTNS = [{
	type: SPECIAL.DRAGON_RED,
	selector: '#btn_dragon_red',
	imgNone: THEME+'/button_red_up.png',
	imgReady: THEME+'/button_red_active.png',
	imgComplete: THEME+'/button_red_down.png',
},
{
	type: SPECIAL.DRAGON_GREEN,
	selector: '#btn_dragon_green',
	imgNone: THEME+'/button_green_up.png',
	imgReady: THEME+'/button_green_active.png',
	imgComplete: THEME+'/button_green_down.png',
},
{
	type: SPECIAL.DRAGON_WHITE,
	selector: '#btn_dragon_white',
	imgNone: THEME+'/button_white_up.png',
	imgReady: THEME+'/button_white_active.png',
	imgComplete: THEME+'/button_white_down.png',
}
];

/**
 * To be called when cards are done moving. Handles setting up the UI for dragons, etc.
 */
function onFieldUpdated() {
	var i;
	// prepare buttons if dragons are available
	for (i = 0; i < DRAGON_BTNS.length; i++) {
		var btn = DRAGON_BTNS[i];
		if ($(btn.selector).data('complete') !== true) {
			if (isDragonReady(btn.type)) {
				$(btn.selector).css('background-image', 'url(\'' + btn.imgReady + '\')').data('active', true);
			} else {
				$(btn.selector).css('background-image', 'url(\'' + btn.imgNone + '\')').data('active', false);
			}
		}
	}

	// move cards to the out tray when possible.
	// it is movable when there are no cards that can be placed on that card, and the destination is 1 less than this card.
	// this means that, for a BAMBOO 5, there must be no 4s anywhere in the tray or spare slots.

	// build a list of cards which are on the top of their stacks, and are potentially eligible to be automatically moved.
	var movableTops = [];
	var cards;
	var card;
	for (i = 0; i < SLOTS.TRAY.length; i++) {
		cards = SLOTS.TRAY[i].cards;
		if (cards.length > 0) {
			card = cards[cards.length - 1];
			if (card.value || card.special === SPECIAL.FLOWER) {
				movableTops.push(card);
			}
		}
	}
	for (i = 0; i < SLOTS.SPARE.length; i++) {
		cards = SLOTS.SPARE[i].cards;
		if (cards.length > 0) {
			card = cards[cards.length - 1];
			if (card.value || card.special === SPECIAL.FLOWER) {
				movableTops.push(card);
			}
		}
	}

	for (i = 0; i < movableTops.length; i++) {
		var canOut = true;
		var outSlot = undefined;
		var cardAbove = undefined;

		card = movableTops[i];
		if (card.special == SPECIAL.FLOWER) {
			// flower can always move to flower slot.
			outSlot = SLOTS.FLOWER[0];
		} else if (card.value > 2) {
			// output only if all cards with -1 value are in the out tray.
			for (var suit in SUITS) {
				cardAbove = getCard(card.value - 1, SUITS[suit]);
				if (cardAbove) {
					if (cardAbove.slot.type != 'out') {
						canOut = false;
						break;
					} else {
						// card-1 is in the out slot, save that location.
						if (cardAbove.suit == card.suit) {
							outSlot = cardAbove.slot;
						}
					}
				}
			}
		} else if (card.value === 2) {
			// output only if the '1' valued card with same suit is in the out tray.
			cardAbove = getCard(1, card.suit);
			if (cardAbove) {
				if (cardAbove.slot.type != 'out') {
					canOut = false;
				} else {
					outSlot = cardAbove.slot;
				}
			}
		} else {
			// output this '1' valued card to the first empty 'out' slot
			for (var j = 0; j < SLOTS.OUT.length; j++) {
				if (SLOTS.OUT[j].cards.length === 0) {
					outSlot = SLOTS.OUT[j];
					break;
				}
			}
		}

		if (canOut && outSlot) {
			tweenCard(card, outSlot, outSlot.cards.length);
			setTimeout(onFieldUpdated, CARD_ANIMATION_SPEED);
			// don't move any more top cards in this iteration, next will be moved after this card finishes.
			break;
		}
	}

	$('#hint').hide();

	if (!(getUrlParameters('hint') === 'false')) {
		if (solveWorker != undefined) {
			solveWorker.terminate();
		}
		solveWorker = new Worker('js/solveWorker.js');

		solveWorker.onmessage = function (event) {
			if (event.data.length === 0) {
				return;
			}
			$('#hint').off('click');
			$('#hint').click(function () {
				console.log(event.data);
				var next_step = event.data[event.data.length - 2];
				console.log("Performing:" + next_step);
				if (next_step.startsWith('collect_dragon')) {
					var b;
					if (next_step.endsWith('green')) {
						b = DRAGON_BTNS[1];
					} else if (next_step.endsWith('red')) {
						b = DRAGON_BTNS[0];
					} else if (next_step.endsWith('white')) {
						b = DRAGON_BTNS[2];
					}
					var i;
					var list = getSpecialCards(b.type);

					var openSlot;
					for (i = 0; i < SLOTS.SPARE.length; i++) {
						var set = SLOTS.SPARE[i].cards;
						// TODO: if any spare slot already has this dragon, go to that one instead.
						if (set.length >= DRAGON_COUNT && set[0].special == b.type) {
							return false;
						}

						if (set.length === 0 || set[0].special == b.type && set.length < DRAGON_COUNT) {
							openSlot = SLOTS.SPARE[i];
							break;
						}
					}

					if (list.length > 0 && openSlot !== undefined) {
						for (i = 0; i < list.length; i++) {
							setTimeout(
								function (card, slot, depth) {
									card.element.addClass(cardBacking());
									tweenCard(card, slot, depth,);
								},
								i * 75,
								list[i], openSlot, openSlot.cards.length
							);
						}
						setTimeout(
							function (selector, imgComplete) {
								$(selector)
									.css('background-image', 'url(\'' + imgComplete + '\')')
									.data('complete', true);
								balanceCards();
							},
							list.length * 75, b.selector, b.imgComplete
						);
						setTimeout(onFieldUpdated, list.length * 75 + CARD_ANIMATION_SPEED);
					}
				} else if (next_step.startsWith('tt')) {
					for (var i = Number(next_step[7]) - 1; i >= 0; i--) {
						tweenCard(SLOTS.TRAY[Number(next_step[3])].cards[SLOTS.TRAY[Number(next_step[3])].cards.length - 1 - i],
							SLOTS.TRAY[Number(next_step[5])],
							SLOTS.TRAY[Number(next_step[5])].cards.length);
					}
					setTimeout(onFieldUpdated, CARD_ANIMATION_SPEED * 2);
				} else if (next_step.startsWith('st')) {
					tweenCard(SLOTS.SPARE[Number(next_step[3])].cards[0],
						SLOTS.TRAY[Number(next_step[5])],
						SLOTS.TRAY[Number(next_step[5])].cards.length);
					setTimeout(onFieldUpdated, CARD_ANIMATION_SPEED * 2);
				} else if (next_step.startsWith('ts')) {
					tweenCard(SLOTS.TRAY[Number(next_step[3])].cards[SLOTS.TRAY[Number(next_step[3])].cards.length - 1],
						SLOTS.SPARE[Number(next_step[5])],
						0);
					setTimeout(onFieldUpdated, CARD_ANIMATION_SPEED * 2);
				}
				$('#hint').hide();
			});
			$('#hint').show();
		};
		solveWorker.postMessage(JSON.parse(JSON.stringify(getCurrentState())));
	}

	// no more top cards to move, is the field clear?
	var allGood = true;
	for (i = 0; i < SLOTS.TRAY.length; i++) {
		if (SLOTS.TRAY[i].cards.length !== 0) {
			allGood = false;
			break;
		}
	}

	if (allGood) {
		if (!isInVictory) {
			localStorage.shenzhen_win_count++;
			updateWinCount();
		}
		isInVictory = true;
		// wait for any possible animations to finish.
		setTimeout(function () {
			victoryScreen();
		}, CARD_ANIMATION_SPEED);
	}
}

/**
 * Moves a card to a slot and position, then smoothly animates the transition.
 * @param  {Card}   card     The card to move
 * @param  {SLOT}   slot     The destination slot for the card
 * @param  {Integer}   depth    The position in the slot for the card
 * @param  {Function} callback Called when the animation is complete with the arguments (card, slot, depth)
 */
function tweenCard(card, slot, depth, callback) {
	// remember the original position, move the card to determine the final position, then reset to original and interpolate between them.

	var oldOffset = card.element.offset();
	insertCard(card, slot, depth);
	var newOffset = card.element.offset();

	var dY = newOffset.top - oldOffset.top,
		dX = newOffset.left - oldOffset.left;
	var finalY = parseInt(card.element.css('top')),
		finalX = parseInt(card.element.css('left'));

	card.element.css({
		top: finalY - dY,
		left: finalX - dX,
		'z-index': 99
	});

	card.element.animate({
		top: finalY,
		left: finalX
	}, CARD_ANIMATION_SPEED, 'swing', function () {
		card.element.css('z-index', '');

		if (typeof callback === 'function') {
			callback(card, slot, depth);
		}
	});
}

function cardBacking() {
	if (useLocalStorage) {
		if (localStorage.shenzhen_win_count >= 200) {
			return 'card-reverse grand_dragon grand_dragon_2';
		} else if (localStorage.shenzhen_win_count >= 100) {
			return 'card-reverse grand_dragon';
		}
	}
	return 'card-reverse';
}

/**
 * Creates an jQuery action function for a button from DRAGON_BTNS
 * @param  {DRAGON_BTNS element} b The button description
 * @return {Function}
 */
function dragonBtnListener(b) {
	return function () {
		if ($(this).data('active') === true) {
			var i;
			var list = getSpecialCards(b.type);

			var openSlot;
			for (i = 0; i < SLOTS.SPARE.length; i++) {
				var set = SLOTS.SPARE[i].cards;
				// TODO: if any spare slot already has this dragon, go to that one instead.
				if (set.length >= DRAGON_COUNT && set[0].special == b.type) {
					return false;
				}

				if (set.length === 0 || set[0].special == b.type && set.length < DRAGON_COUNT) {
					openSlot = SLOTS.SPARE[i];
					break;
				}
			}

			if (list.length > 0 && openSlot !== undefined) {
				for (i = 0; i < list.length; i++) {
					setTimeout(
						function (card, slot, depth) {
							card.element.addClass(cardBacking());
							tweenCard(card, slot, depth,);
						},
						i * 75,
						list[i], openSlot, openSlot.cards.length
					);
				}
				setTimeout(
					function (selector, imgComplete) {
						$(selector)
							.css('background-image', 'url(\'' + imgComplete + '\')')
							.data('complete', true);
						balanceCards();
						},
						list.length * 75, b.selector, b.imgComplete
					);
				setTimeout(onFieldUpdated, list.length * 75 + CARD_ANIMATION_SPEED);
			}
		}
	};
}

for (var i = 0; i < DRAGON_BTNS.length; i++) {
	var btn = DRAGON_BTNS[i];
	$(btn.selector).click(dragonBtnListener(btn));
}

/**
 * Finds whether the given stack is valid to be picked up,
 * IE:
 * If the stack is a single card.
 * OR From the bottom-most card up, each is a numbered card, decreases by in value by 1, and is not the same color as the previous.
 * @param  {Array[Card]} stack A list of cards, with the first element being the "bottom-most" card.
 * @param  {SLOT} sourceSlot The type of slot this comes from
 * @return {Boolean}  Whether the stack can be picked up
 */
function canPickUpStack(stack, sourceSlot) {
	if (DEBUG === true) {
		return true;
	}
	if (sourceSlot.type == 'tray') {
		if (stack.length == 1) {
			return true;
		} else {
			for (var i = 1; i < stack.length; i++) {
				var prev = stack[i - 1],
					curr = stack[i];
				if (prev.value && curr.value && prev.value == curr.value + 1 && prev.suit != curr.suit) {
					continue;
				} else {
					return false;
				}
			}
		}
		return true;
	} else if (sourceSlot.type == 'spare') {
		// once all dragons are stacked in there, you can't move it.
		return sourceSlot.cards.length != DRAGON_COUNT;
	}
}

/**
 * Finds whether the given stack can be put on the given destination.
 * The stack is assumed to be valid to pick up.
 *
 * The destination must be a numbered one. The stack bottom must be numbered, or undefined.
 * The destination must be numbered, one more than the stack bottom, and not the same suit.
 * @param  {Array[Card]} stack The list of cards which are picked up.
 * @param  {SLOT} destSlot
 * @param  {Card} dest  The card which the lowest of the stack will rest upon.
 * @return {Boolean} Whether the stack can be placed on it.
 */
function canPlaceStack(stack, destSlot, dest) {
	if (DEBUG === true) {
		return true;
	}

	if (destSlot.type == 'tray') {
		if (stack.length === 0 || dest === undefined) {
			return true;
		} else {
			if (stack[0].value && dest.value) {
				return (stack[0].value + 1 == dest.value) && (stack[0].suit != dest.suit);
			} else {
				return false;
			}
		}
	} else if (destSlot.type == 'flower') {
		// only flower allowed in flower slot, except during debug
		return stack[0].special === SPECIAL.FLOWER;
	} else if (destSlot.type == 'spare') {
		// only 1 card manually placed in spare slot
		return destSlot.cards.length === 0 && stack.length == 1;
	} else if (destSlot.type == 'out') {
		// a single numbered card
		if (stack.length === 1 && stack[0].value) {
			if (dest === undefined) {
				// if empty, must be value '1' card.
				return stack[0].value == 1;
			} else {
				// otherwise, must be the next value
				return stack[0].value == dest.value + 1 && stack[0].suit == dest.suit;
			}
		}
	}
}

/**
 * Sorts the cards in a consistent order.
 * Modifies the given array.
 * @param  {Array[Card]} cards The array of cards to be sorted.
 */
function sortCards(cards) {
	cards.sort(function (a, b) {
		var aHas = typeof a.value !== 'undefined';
		var bHas = typeof b.value !== 'undefined';
		if (aHas && bHas) {
			if (a.value == b.value) {
				return a.suit.order - b.suit.order;
			} else {
				return a.value - b.value;
			}
		} else {
			if (aHas) {
				return -1;
			} else if (bHas) {
				return 1;
			} else {
				return a.special.order - b.special.order;
			}
		}
	});
}

/**
 * Sets up a new game with randomly placed cards.
 * @param  {Array[Card]} cards List of cards which will be placed.
 * @param  {HTMLElement} board The container for the cards.
 * @param  {Object} seed (optional) The random seed for shuffling the deck. If omitted, the time is used.
 */
function startNewGame(cards, board, seed) {
	$('.card').finish();
	clearInterval(looper);
	looper = undefined;
	isInVictory = false;

	sortCards(cards);

	var truSeed = seed;
	// use time-based seed if there is no seed, or is an empty string.
	if (seed === undefined || (typeof seed === 'string' && seed.length === 0)) {
		truSeed = new Date().getTime();
	}
	// if input is a numeric string, convert to an integer ("123" and 123 behave differently)
	if (!isNaN(parseInt(truSeed, 10))) {
		truSeed = parseInt(truSeed, 10);
	}

	currentSeed = truSeed;

	Math.seedrandom(truSeed);

	// eslint-disable-next-line no-console
	console.log('Game id:', truSeed);

	shuffleArray(cards); // shuffle cards

	for (var i = 0; i < cards.length; i++) {
		cards[i].element.appendTo(board);
		insertCard(cards[i], SLOTS.FLOWER[0], i);
	}
	$('.card').addClass(cardBacking()); //TODO PLUS BACK
	$('.card').visible();
	$('.btn-dragon').data('complete', false);
	for(var i = 0; i < DRAGON_BTNS.length; i++) {
		var btn = DRAGON_BTNS[i];
		$(btn.selector).css('background-image', 'url(\'' + btn.imgNone + '\')').data('active', false);
	}
	for (var row = 0; row < 5; row++) {
		for (var col = 0; col < 8; col++) {
			setTimeout(function (card, col, row) {
				card.element.removeClass(cardBacking());
				tweenCard(card, SLOTS.TRAY[col], row);
			},(row*8+col)*80,cards[39-(row*8+col)], col, row);
		}
	}
	setTimeout(function () {
		onFieldUpdated();
	}, 40*80 + CARD_ANIMATION_SPEED);
}

function updateWinCount() {
	if (useLocalStorage) {
		$('#win_count').text(localStorage.shenzhen_win_count);
	}
}

/**
 * Whether the victory screen is currently running.
 * @type {Boolean}
 */
var isInVictory = false;
var looper; // the interval identifier for the cards dropping in the victory screen.
/**
 * Runs the victory screen, where cards drop down the screen.
 */
function victoryScreen() {
	var cards = [];

	var stax = $('.slot-spare,.slot-flower,.slot-out');
	var foundThisRun = false;
	do {
		foundThisRun = false;
		for (var i = 0; i < stax.length; i++) {
			var childs = $(stax[i]).children();
			var searchI = $(stax[i]).data('search-i') === undefined ? (childs.length - 1) : $(stax[i]).data('search-i');
			if (searchI >= 0) {
				cards.push(childs[searchI]);
				foundThisRun = true;
				$(stax[i]).data('search-i', searchI - 1);
			}
		}
	} while (foundThisRun);
	stax.removeData('search-i');

	var row = 0;

	// each iteration, over time, take the first card and shunt it down.
	if (looper !== undefined) {
		clearInterval(looper);
	}
	looper = setInterval(function () {
		$(cards[row]).animate({
			top: parseInt($(cards[row]).css('top')) + 1000
		}, 1000);

		row++;
		if (row >= cards.length) {
			clearInterval(looper);
			looper = undefined;
			isInVictory = false;
		}
	}, 50);
}

/**
 * Creates a stack of all cards including and stacked on top of the given card.
 * @param  {HTMLElement} cardElement The element for the card.
 * @return {Array[Card]}      An array of cards
 */
function getStackFromCardElement(cardElement) {
	var card = $(cardElement).data('card');

	var cardIndex = card.slot.cards.indexOf(card),
		cardLength = card.slot.cards.length;

	var stack = [];
	for (var i = cardIndex; i < cardLength; i++) {
		stack.push(card.slot.cards[i]);
	}

	return stack;
}

var cards;
var solveWorker = undefined;
$(document).ready(function () {

	if (useLocalStorage) {
		if (localStorage.shenzhen_win_count === undefined) {
			localStorage.shenzhen_win_count = 0;
		}
	}
	updateWinCount();

    var head = document.getElementsByTagName('head')[0];
	
	var link_theme_css = document.createElement('link');
    link_theme_css.type = 'text/css';
    link_theme_css.rel = 'stylesheet';
    link_theme_css.href = 'css/'+THEME+'.css';
    head.appendChild(link_theme_css);

	var link_favicon = document.createElement('link');
	link_favicon.type='image/x-icon';
	link_favicon.rel='icon';
	link_favicon.href=THEME+'/favicon.ico';
	head.appendChild(link_favicon);

	var board = $('#cards');
	populateSlots(SLOTS, board);

	cards = makeDeck();

	// if there is a hash in the url upon load, load that as the seed.
	startNewGame(cards, board, location.hash.replace('#', ''));

	$('#newGame').click(function () {
		// clear the hash from the url.
		history.pushState('', document.title, window.location.pathname + window.location.search);

		startNewGame(cards, board);
	});

	$('#retryGame').click(function () {
		if (currentSeed !== null) {
			location.hash = currentSeed;
			startNewGame(cards, board, currentSeed);
		}
	});

	$('#playMusicButton').click(function() {
		music.play();
		if (music.currentTime > 0 && music.currentTime < 5) {
			music.currentTime = 0;
		}
		$('#playMusicButton').hide();
		$('#pauseMusicButton').show();
	});

	$('#pauseMusicButton').click(function() {
		music.pause();
		$('#playMusicButton').show();
		$('#pauseMusicButton').hide();
	});

	$('#hint').hide();

	// Make the cards interactable
	$('.slot').droppable({
		drop: function (event, ui) {
			// drop is contingent on "accept", so this is a valid stack.
			var stack = getStackFromCardElement(ui.draggable);
			var slot = $(this).data('slot');

			// insert all from stack into the bottom of the slot.
			for (var i = 0; i < stack.length; i++) {
				insertCard(stack[i], slot, slot.cards.length);
			}
			onFieldUpdated();
		},
		accept: function (draggable) {
			var stack = getStackFromCardElement(draggable);
			var slot = $(this).data('slot');

			return canPlaceStack(stack, slot, slot.cards[slot.cards.length - 1]);
		},
		tolerance: 'pointer'
	});

	$('.card').draggable({
		'cursor': 'url(assets/cursor_normal.png) 40 40, default',
		'revert': 'invalid',
		'revertDuration': 0,
		helper: function () {
			var cardSet = $('<div></div>');
			cardSet.css({
				'z-index': 100,
				'display': 'inline'
			});

			var card = $(this).data('card');
			var cardIndex = card.slot.cards.indexOf(card),
				cardLength = card.slot.cards.length;

			for (var i = cardIndex, height = 0; i < cardLength; i++ , height++) {
				var e = card.slot.cards[i].element.clone();
				e.css({
					top: height * CARD_STACK_GAP,
					left: '',
				});
				cardSet.append(e);
			}
			return cardSet;
		},
		start: function (event, _ui) {
			var card = $(this).data('card');

			var stack = [];
			var cardIndex = card.slot.cards.indexOf(card),
				cardLength = card.slot.cards.length;
			var i;
			for (i = cardIndex; i < cardLength; i++) {
				stack.push(card.slot.cards[i]);
			}

			if (!card.element.is(':animated') && canPickUpStack(stack, card.slot)) {
				for (i = 0; i < stack.length; i++) {
					stack[i].element.invisible();
				}
			} else {
				event.stopPropagation();
				event.stopImmediatePropagation();
				event.preventDefault();
			}
		},
		stop: function (_event, _ui) {
			var card = $(this).data('card');

			var cardIndex = card.slot.cards.indexOf(card),
				cardLength = card.slot.cards.length;
			for (var i = cardIndex; i < cardLength; i++) {
				card.slot.cards[i].element.visible();
			}
		}
	});

	music = new Audio(THEME+"/Solitaire.ogg");
	music.loop = true;
	$(music).on('canplay', function() {
		$('#playMusicButton').show();
		$(music).off('canplay');
	})
	$(music).on('error', function (_data, _handler) {
		console.warn('Couldn\'t load music from the original game. If you own SHENZHEN I/O, copy "Content/music/Solitaire.ogg" from the game into the "solitaire" directory of the cloned repository.');
	});

	$('html').keydown(function () { }); // UI breakpoint for debugging in Chrome
});

function getUrlParameters(variable) {
	var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        if(pair[0] == variable) {
			return pair[1];
		}
    }
}

function getCurrentState() {
	var c = {
		spare: [],
		tray: [[],[],[],[],[],[],[],[]],
		flower: false,
		out: {
			bamboo: 0,
			char: 0,
			coin: 0
		},
	};
	for (var i = 0; i < 3; i++) {
		if(SLOTS.SPARE[i].cards.length==DRAGON_COUNT) {
			c.spare[i] = {
				type: 'collected'
			};
		}
		else {
			c.spare[i] = {
				type: 'empty'
			}
		}
	}
	for (var i = 0; i < cards.length; i++) {
		var card = cards[i];
		if (card.slot.type === 'flower') {
			c.flower = true;
			continue;
		} else if (card.slot.type === 'out') {
			var value = card.value;
			var color = card.suit.small;
			if (color === 'coins') {
				if (c.out.coin<value) {
					c.out.coin=value;
				}
			} else if (color === 'bamboo') {
				if (c.out.bamboo<value) {
					c.out.bamboo=value;
				}
			} else if (color === 'characters') {
				if (c.out.char<value) {
					c.out.char=value;
				}
			}
			continue;
		} else if (card.slot.type === 'spare') {
			if (card.slot.cards.length === DRAGON_COUNT) {
				continue;
			}
		}
		if (card.special!=undefined) {
			if (card.slot.type === 'spare') {
				var slot = (card.slot.left-46)/152;
				if (card.special.small === "flower") {
					c.spare[slot] = {
						type: 'flower'
					};
				} else {
					c.spare[slot] = {
						type: 'special',
						color: card.special.small,
					};
				}
			} else {
				var slot = (card.slot.left-46)/152;
				var depth = (card.element.offset().top-282)/30;
				if (card.special.small === "flower") {
					c.tray[slot][depth] = {
						type: 'flower'
					};
				} else {
					c.tray[slot][depth] = {
						type: 'special',
						color: card.special.small,
					};
				}
			}
		} else {
			if (card.slot.type === 'spare') {
				var slot = (card.slot.left-46)/152;
				c.spare[slot] = {
					type: 'number',
					color: card.suit.small,
					value: card.value,
				};
			} else {
				var slot = (card.slot.left-46)/152;
				var depth = (card.element.offset().top-282)/30;
				c.tray[slot][depth] = {
					type: 'number',
					color: card.suit.small,
					value: card.value,
				};
			}
		}
	}
	return c;
}