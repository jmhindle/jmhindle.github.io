/**
 * @fileoverview The main logic for the Blackjack game. The application is
 * controlled by the state object.  Event handlers wait for the user to do
 * something, that updates the state and the HTML re-renders based on the new
 * state.  Initialization is done when the page loads.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const app = {
    settingsView: document.getElementById('settings-view'),
    trainingView: document.getElementById('training-view'),
    chartView: document.getElementById('chart-view'),
    settingButtons: document.querySelectorAll('.setting-btn'),
    decksSelect: document.getElementById('decks'),
    maxBetSelect: document.getElementById('max-bet'),
    customProgressionInput: document.getElementById('custom-progression-input'),
    viewChartBtn: document.getElementById('view-chart-btn'),
    startTrainingBtn: document.getElementById('start-training-btn'),
    backToSettings: document.getElementById('back-to-settings'),
    backToSettingsFromChart:
        document.getElementById('back-to-settings-from-chart'),
    dealerHandEl: document.getElementById('dealer-hand'),
    playerHandEl: document.getElementById('player-hand'),
    dealerTotalEl: document.getElementById('dealer-total'),
    actionControls: document.getElementById('action-controls'),
    chartContainer: document.getElementById('chart-container'),
    correctCountEl: document.getElementById('correct-count'),
    incorrectCountEl: document.getElementById('incorrect-count'),
    winCountEl: document.getElementById('win-count'),
    lossCountEl: document.getElementById('loss-count'),
    pushCountEl: document.getElementById('push-count'),
    toggleCountBtn: document.getElementById('toggle-count-btn'),
    countDisplay: document.getElementById('count-display'),
    runningCountEl: document.getElementById('running-count'),
    trueCountEl: document.getElementById('true-count'),
    toggleBettingBtn: document.getElementById('toggle-betting-btn'),
    bettingDisplay: document.getElementById('betting-display'),
    bettingTableBody: document.getElementById('betting-table-body'),
    simulateShoeBtn: document.getElementById('simulate-shoe-btn'),
    endOfShoeModal: document.getElementById('end-of-shoe-modal'),
    endOfShoeTitle: document.getElementById('end-of-shoe-title'),
    endOfShoeMessage: document.getElementById('end-of-shoe-message'),
    reviewMistakesBtn: document.getElementById('review-mistakes-btn'),
    shuffleBtn: document.getElementById('shuffle-btn'),
    backToMenuBtn: document.getElementById('back-to-menu-btn'),
    reviewModal: document.getElementById('review-modal'),
    reviewCountEl: document.getElementById('review-count'),
    reviewPlayerHandEl: document.getElementById('review-player-hand'),
    reviewDealerCardEl: document.getElementById('review-dealer-card'),
    reviewUserActionEl: document.getElementById('review-user-action'),
    reviewCorrectActionEl: document.getElementById('review-correct-action'),
    reviewExplanationEl: document.getElementById('review-explanation'),
    reviewOutcomeResultEl: document.getElementById('review-outcome-result'),
    reviewOutcomeNoteEl: document.getElementById('review-outcome-note'),
    reviewPrevBtn: document.getElementById('review-prev-btn'),
    reviewNextBtn: document.getElementById('review-next-btn'),
    finishReviewBtn: document.getElementById('finish-review-btn'),
    blackjackGraphicEl: document.getElementById('blackjack-graphic'),
    incorrectActionModal: document.getElementById('incorrect-action-modal'),
    correctActionTextEl: document.getElementById('correct-action-text'),
    acknowledgeIncorrectBtn:
        document.getElementById('acknowledge-incorrect-btn'),
  };

  // --- Game State & Settings ---
  let state = {};
  let tempActionStore = null;  // Incorrect action modal flow control

  const initBettingStrategies = () => {
    const strategies = {
      flat: { name: 'Flat Bet (1 Unit)', runningTotal: 0, maxGain: 0, maxLoss: 0, currentBet: 1 },
      adaptive: { name: 'Adaptive (True Count)', runningTotal: 0, maxGain: 0, maxLoss: 0, currentBet: 1 },
      progressive: { name: '1-3-2-6 Progressive', runningTotal: 0, maxGain: 0, maxLoss: 0, currentBet: 1, progressionIndex: 0, progression: [1, 3, 2, 6] },
      martingale: { name: 'Martingale (Double on Loss)', runningTotal: 0, maxGain: 0, maxLoss: 0, currentBet: 1 },
      dalembert: { name: 'D\'Alembert', runningTotal: 0, maxGain: 0, maxLoss: 0, currentBet: 1 },
    };
    if (state.settings.customProgression &&
        state.settings.customProgression.length > 0) {
      const customName =
          `${state.settings.customProgression.join('-')} Progressive`;
      strategies.custom = { name: customName, runningTotal: 0, maxGain: 0, maxLoss: 0, currentBet: 1, progressionIndex: 0, progression: state.settings.customProgression };
    }
    return strategies;
  };

  const initState = () => {
    state = {
      settings: {
        dealerOnSoft17: 'h17',
        doubleAfterSplit: 'das',
        surrender: 'nosurrender',
        decks: 6,
        maxBet: Infinity,
        customProgression: [],
      },
      playerHands: [],
      activeHandIndex: 0,
      dealerHand: [],
      fullDeck: [],
      currentDeck: [],
      correctCount: 0,
      incorrectCount: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      runningCount: 0,
      showCount: false,
      betting: {},
      showBetting: true,
      isSimulating: false,
      incorrectHandsLog: [],
      reviewIndex: 0,
    };
  };

  const SUITS = {'♠': 'black', '♣': 'black', '♥': 'red', '♦': 'red'};
  const VALUES =
      ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

  // --- Strategy Charts ---
  const strategy = {
    // Hard totals strategy (no player Ace)
    hard: {
      // Stand on 17 or higher.
      21: {all: 'S'}, 20: {all: 'S'}, 19: {all: 'S'}, 18: {all: 'S'}, 17: {all: 'S'},

      // 16 Stands against 2-6, Hits against higher.
      // Surrenders against 9, 10, A if available.
      16: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'Rh', T: 'Rh', A: 'Rh' },

      // 15 Stands against 2-6, Hits against higher.
      // Surrenders against 10 if available.
      15: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', T: 'Rh', A: 'H' },

      // 13 and 14 Stand against 2-6, Hits against higher.
      14: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', T: 'H', A: 'H' },
      13: { 2: 'S', 3: 'S', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', T: 'H', A: 'H' },

      // 12 Stands against 4-6, Hits otherwise
      12: { 2: 'H', 3: 'H', 4: 'S', 5: 'S', 6: 'S', 7: 'H', 8: 'H', 9: 'H', T: 'H', A: 'H' },

      11: {all: 'D'},  // Always double on 11

      // 10 Doubles agsinst everything except 10 or A, where it hits.
      10: { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', T: 'H', A: 'H' },

      // 9 Doubles against 3-6, Hits otherwise.
      9: { 2: 'H', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'H', 8: 'H', 9: 'H', T: 'H', A: 'H' },

      // 8 or lower always hits
      8: {all: 'H'}, 7: {all: 'H'}, 6: {all: 'H'}, 5: {all: 'H'}, 4: {all: 'H'},
    },

    // Soft totals strategy (player Ace)
    soft: {
      21: {all: 'S'},           // Blackjack
      20: {all: 'S'},           // Always stand on A,9
      19: {6: 'Ds', all: 'S'},  // Double against 6, stand otherwise

      // A,7 doubles against 6 or less.  Stands against 7,8.  Hits against 9 or
      // higher
      18: { 2: 'Ds', 3: 'Ds', 4: 'Ds', 5: 'Ds', 6: 'Ds', 7: 'S', 8: 'S', 9: 'H', T: 'H', A: 'H' },

      // A,6 doubles against 3-6, hits otherwise
      17: {3: 'D', 4: 'D', 5: 'D', 6: 'D', all: 'H'},

      // A,5 or A,4 doubles against 4-6, hits otherwise
      16: {4: 'D', 5: 'D', 6: 'D', all: 'H'},
      15: {4: 'D', 5: 'D', 6: 'D', all: 'H'},

      // A,3 or A,2 doubles against 5 or 6, hits otherwise
      14: {5: 'D', 6: 'D', all: 'H'},
      13: {5: 'D', 6: 'D', all: 'H'},
    },

    // Split strategy
    pairs: {
      A: {all: 'P'},  // always split aces
      T: {all: 'S'},  // never split 10s

      // Always split 9s except against 7, 10, or A
      9: { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'S', 8: 'P', 9: 'P', T: 'S', A: 'S' },

      8: {all: 'P'},  // always split 8s

      // Split 7s against 7 or lower, hit otherwise
      7: { 2: 'P', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', T: 'H', A: 'H' },

      // Split 6's against a 2 only if Double after split is allowed, otherwise
      // hit.
      // Split 6's against 3-6.  Hit against 7 or higher.
      6: { 2: 'Ph', 3: 'P', 4: 'P', 5: 'P', 6: 'P', 7: 'H', 8: 'H', 9: 'H', T: 'H', A: 'H' },

      // Never split 5s, double against everything except 10 or A.
      5: { 2: 'D', 3: 'D', 4: 'D', 5: 'D', 6: 'D', 7: 'D', 8: 'D', 9: 'D', T: 'H', A: 'H' },

      // Only split fours if double after split is allowed and facing a 5 or 6.
      4: { 2: 'H', 3: 'H', 4: 'H', 5: 'Ph', 6: 'Ph', 7: 'H', 8: 'H', 9: 'H', T: 'H', A: 'H' },

      // For 2s and 3s.  Split against 2 or 3 if double after split is allowed.
      // Split against 4-7, Hit otherwise.
      3: { 2: 'Ph', 3: 'Ph', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', T: 'H', A: 'H' },
      2: { 2: 'Ph', 3: 'Ph', 4: 'P', 5: 'P', 6: 'P', 7: 'P', 8: 'H', 9: 'H', T: 'H', A: 'H' },
    }
  };

  // --- Core Game Logic ---

  // Gets the value for calculating hand totals.
  const getCardValue = (card) => {
    const value = card.slice(0, -1);
    if (['T', 'J', 'Q', 'K'].includes(value)) return 10;
    if (value === 'A') return 11;
    return parseInt(value);
  };

  const getHandTotal = (hand) => {
    const originalAces = hand.filter(card => card.startsWith('A')).length;
    let total = hand.reduce((sum, card) => sum + getCardValue(card), 0);
    let acesToReduce = originalAces;
    while (total > 21 && acesToReduce > 0) {
      total -= 10;
      acesToReduce--;
    }
    const isSoft = originalAces > 0 && acesToReduce > 0;
    return {total, soft: isSoft};
  };

  // Card counting logic.  <=6 is +1, >=10 is -1, 7-9 is 0.
  const getCardCountValue = (card) => {
    const value = card.slice(0, -1);
    if (['2', '3', '4', '5', '6'].includes(value)) return 1;
    if (['T', 'J', 'Q', 'K', 'A'].includes(value)) return -1;
    return 0;  // 7, 8, 9
  };
  const updateCount = (card) => {
    state.runningCount += getCardCountValue(card);
    updateCountDisplay();
  };
  // Adjusts running count to account for decks remaining.
  const getTrueCount = () => {
    const decksRemaining = Math.max(0.25, state.currentDeck.length / 52);
    return state.runningCount / decksRemaining;
  };
  const updateCountDisplay = () => {
    const trueCount = getTrueCount();
    app.runningCountEl.textContent = state.runningCount;
    app.trueCountEl.textContent = trueCount.toFixed(1);
  };

  // Evaluates the strategy tables against the current state to determine
  // which action is considered correct.
  const getCorrectAction =
      (playerHandCards, dealerCard, settings, forChart = false) => {
        const {total: playerTotal, soft: isSoft} =
            getHandTotal(playerHandCards);
        if (playerTotal >= 21) return 'S';
        const dealerFaceValue = dealerCard.slice(0, -1).replace(/[JQK]/, 'T');

        const isPair = playerHandCards.length === 2 &&
            getCardValue(playerHandCards[0]) ===
                getCardValue(playerHandCards[1]);
        let table, handKey;

        // Choose the correct strategy table and row for the current player
        // hand.  Check for pairs first, then a soft hand.
        if (isPair) {
          table = strategy.pairs;
          handKey = playerHandCards[0].slice(0, -1).replace(/[JQK]/, 'T');
        } else if (isSoft) {
          table = strategy.soft;
          handKey = playerTotal;
        } else {
          table = strategy.hard;
          handKey = playerTotal;
        }

        let action =
            (table[handKey] &&
             (table[handKey][dealerFaceValue] || table[handKey].all)) ||
            'H';

        // If we are just getting the action to render the chart, don't
        // adapt to the situation, just return the raw action.
        if (forChart) {
          return action;
        }

        // Apply rule variations
        if (action === 'Ph' && settings.doubleAfterSplit === 'ndas') {
          action = 'H';
        }

        const afterSplit = state.playerHands.length > 1 &&
            state.playerHands.some(h => h.originId);

        // Go to the secondary action if the primary is Double and the
        // player has already taken a card, or they have split and the
        // rule is no doubles after a split.
        if (playerHandCards.length > 2 ||
            (afterSplit && settings.doubleAfterSplit === 'ndas')) {
          if (action === 'D') action = 'H';
          if (action === 'Ds') action = 'S';
        }

        // Surrendering is only valid if the rules allow it and the player
        // hasn't already taken a card.
        if ((action === 'Rh') &&
            ((playerHandCards.length > 2) ||
             (settings.surrender === 'nosurrender'))) {
          action = 'H';
        }

        // If we still have an action with a secondary choice, choose the
        // primary.
        if (action === 'Ds') return 'D';
        if (action === 'Rh') return 'R';
        if (action === 'Ph') return 'P';

        return action;
      };

  // fullDeck is the array that holds all the original cards for the 'shoe' in
  // perfect order.  When we start shuffling, we take a copy of this array.  
  const createFullDeck = () => {
    state.fullDeck = [];
    for (let i = 0; i < state.settings.decks; i++) {
      for (const suit in SUITS) {
        for (const value of VALUES) {
          state.fullDeck.push(value + suit);
        }
      }
    }
  };

  // Shuffles the deck - the currentDeck is a copy of the fullDeck and then we
  // do a Fisher-Yates shuffle on it.
  const shuffleDeck = () => {
    state.currentDeck = [...state.fullDeck];
    for (let i = state.currentDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.currentDeck[i], state.currentDeck[j]] =
          [state.currentDeck[j], state.currentDeck[i]];
    }
    state.runningCount = 0;
    state.incorrectHandsLog = [];
    updateCountDisplay();
  };

   const setNextBets = () => {
            // Flat bet is always 1, no change needed.
            
            // Adaptive bet
            const trueCount = getTrueCount();
            let adaptiveBet = 1;
            if (trueCount >= 5) adaptiveBet = 5;
            else if (trueCount >= 4) adaptiveBet = 4;
            else if (trueCount >= 3) adaptiveBet = 3;
            else if (trueCount >= 2) adaptiveBet = 2;
            state.betting.adaptive.currentBet = Math.min(adaptiveBet, state.settings.maxBet);

            // Progressive bet
            const prog = state.betting.progressive;
            if (prog) prog.currentBet = Math.min(prog.progression[prog.progressionIndex], state.settings.maxBet);

            // Custom Progressive bet
            const customProg = state.betting.custom;
            if (customProg) customProg.currentBet = Math.min(customProg.progression[customProg.progressionIndex], state.settings.maxBet);
        };

        const dealNewHand = () => {
            hideBlackjackGraphic();
            if (state.currentDeck.length < 16) {
                if(state.isSimulating) {
                    updateScoreDisplay();
                    updateBettingDisplay();
                }
                state.isSimulating = false;
                app.simulateShoeBtn.disabled = false;
                
                // End of shoe logic
                if(state.incorrectHandsLog.length === 0) {
                    app.endOfShoeTitle.textContent = '🎉 Perfect Play! 🎉';
                    app.endOfShoeMessage.textContent = 'You played the entire shoe without making a single mistake. Well done!';
                    app.reviewMistakesBtn.classList.add('hidden');
                } else {
                    app.endOfShoeTitle.textContent = 'End of Shoe';
                    app.endOfShoeMessage.textContent = `You made ${state.incorrectHandsLog.length} mistake(s). Review them to improve your strategy.`;
                    app.reviewMistakesBtn.classList.remove('hidden');
                }
                app.endOfShoeModal.classList.remove('hidden');
                return;
            }
            
            setNextBets();
            if (!state.isSimulating) updateBettingDisplay();

            state.playerHands = [{ handId: Date.now(), cards: [state.currentDeck.pop(), state.currentDeck.pop()], actionInfo: null, isDoubled: false, result: null, finalTotal: 0, isSplitAce: false }];
            state.activeHandIndex = 0;
            state.dealerHand = [state.currentDeck.pop(), state.currentDeck.pop()];

            updateCount(state.playerHands[0].cards[0]);
            updateCount(state.playerHands[0].cards[1]);
            updateCount(state.dealerHand[0]);
            
            const playerHasBlackjack = getHandTotal(state.playerHands[0].cards).total === 21;
            const dealerHasBlackjack = getHandTotal(state.dealerHand).total === 21;

            if (playerHasBlackjack || dealerHasBlackjack) {
                if (playerHasBlackjack && !dealerHasBlackjack && !state.isSimulating) showBlackjackGraphic();
                playOutBlackjackRound(playerHasBlackjack, dealerHasBlackjack);
            } else {
                if(state.isSimulating) {
                    playAutoHand();
                } else {
                    renderHands(false, true); // Pass true for initial animated deal
                    updateActionButtons();
                    app.dealerTotalEl.textContent = '';
                }
            }
        };
        
        const renderCard = (card, isHidden = false) => {
            if (isHidden) return '<div class="card card-back"></div>';
            const value = card.slice(0, -1);
            const suit = card.slice(-1);
            return `
                <div class="card ${SUITS[suit]}">
                    <div class="corner top"><div>${value}</div><div class="suit">${suit}</div></div>
                    <div class="suit text-4xl">${suit}</div>
                    <div class="corner bottom"><div>${value}</div><div class="suit">${suit}</div></div>
                </div>`;
        };

        const renderHands = (showDealerHoleCard = false, isAnimated = false) => {
            if (state.isSimulating) return;

            app.playerHandEl.innerHTML = state.playerHands.map((handObj, index) => {
                const isActive = index === state.activeHandIndex && state.playerHands.length > 1;
                const handHtml = handObj.cards.map(card => renderCard(card)).join('');
                
                let badgeHtml = '';
                if(handObj.result) {
                    const badgeColor = { WIN: 'bg-green-500', LOSS: 'bg-red-500', PUSH: 'bg-gray-500'}[handObj.result];
                    badgeHtml = `<div class="hand-badge ${badgeColor}">${handObj.result}</div>`;
                }

                let totalHtml = '';
                if(handObj.finalTotal > 0) {
                     let totalColorClass = 'text-gray-900'; // Default to black for PUSH or unresolved
                    if (handObj.result === 'WIN') {
                        totalColorClass = 'text-green-600';
                    } else if (handObj.result === 'LOSS') {
                        totalColorClass = 'text-red-600';
                    }
                    totalHtml = `<div class="hand-total ${totalColorClass}">${handObj.finalTotal}</div>`;
                }

                return `
                    <div class="player-hand-container ${isActive ? 'active-hand' : ''}">
                        <div class="hand-cards ${isAnimated ? 'deal' : ''}">${handHtml}</div>
                        <div class="hand-info">
                            ${badgeHtml}
                            ${totalHtml}
                        </div>
                    </div>`;
            }).join('');

            app.dealerHandEl.innerHTML = state.dealerHand.map((card, index) => renderCard(card, index === 1 && !showDealerHoleCard)).join('');

            if (isAnimated) {
                app.dealerHandEl.classList.add('deal');
            } else {
                app.dealerHandEl.classList.remove('deal');
            }
        };
        
        const updateActionButtons = () => {
            const activeHandObj = state.playerHands[state.activeHandIndex];
            app.simulateShoeBtn.disabled = false;
            if (!activeHandObj) {
                app.actionControls.querySelectorAll('button').forEach(btn => btn.disabled = true);
                return;
            }

            if (activeHandObj.isSplitAce) {
                app.actionControls.querySelectorAll('button:not(#simulate-shoe-btn)').forEach(btn => btn.disabled = true);
                setTimeout(() => endCurrentHand(), 1000);
                return;
            }
            
            const activeHand = activeHandObj.cards;
            const playerTotal = getHandTotal(activeHand).total;
            if (playerTotal >= 21) {
                app.actionControls.querySelectorAll('button:not(#simulate-shoe-btn)').forEach(btn => btn.disabled = true);
                return;
            }

            const maxCurrentBet = Math.max(...Object.values(state.betting).map(s => s.currentBet));
            const canDouble = activeHand.length === 2 && (state.settings.doubleAfterSplit === 'das' || state.playerHands.length === 1) && (maxCurrentBet * 2 <= state.settings.maxBet);
            const isPair = activeHand.length === 2 && getCardValue(activeHand[0]) === getCardValue(activeHand[1]);
            const canSurrender = activeHand.length === 2 && state.settings.surrender === 'surrender' && state.playerHands.length === 1;
            
            app.actionControls.querySelectorAll('button:not(#simulate-shoe-btn)').forEach(btn => btn.disabled = false);
            app.actionControls.querySelector('[data-action="P"]').disabled = !isPair;
            app.actionControls.querySelector('[data-action="D"]').disabled = !canDouble;
            app.actionControls.querySelector('[data-action="R"]').disabled = !canSurrender;
        };
        
        const getActionName = (action) => ({ H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' })[action] || 'Unknown';
        const delay = ms => new Promise(res => setTimeout(res, ms));

        const showBlackjackGraphic = () => {
            app.blackjackGraphicEl.classList.remove('hidden');
            app.blackjackGraphicEl.classList.add('active');
        };

        const hideBlackjackGraphic = () => {
            app.blackjackGraphicEl.classList.add('hidden');
            app.blackjackGraphicEl.classList.remove('active');
        };

        const handleAction = (e) => {
            const chosenAction = e.target.dataset.action;
            if (!chosenAction || e.target.disabled) return;
            const button = e.target.closest('.action-button');

            const activeHandObj = state.playerHands[state.activeHandIndex];
            const activeHand = activeHandObj.cards;
            const correctAction = getCorrectAction(activeHand, state.dealerHand[0], state.settings);
            const isCorrect = chosenAction === correctAction;
            
            if (isCorrect) {
                state.correctCount++;
                button.classList.add('correct');
                setTimeout(() => button.classList.remove('correct'), 700);
                continueHand(chosenAction);
            } else {
                state.incorrectCount++;
                button.classList.add('incorrect');
                setTimeout(() => button.classList.remove('incorrect'), 700);

                // Log the mistake
                state.incorrectHandsLog.push({
                    handId: activeHandObj.handId,
                    playerHand: [...activeHand],
                    dealerCard: state.dealerHand[0],
                    userAction: chosenAction,
                    correctAction: correctAction,
                    handResult: null // Will be populated at end of hand
                });

                app.correctActionTextEl.textContent = `The correct action was to ${getActionName(correctAction)}.`;
                app.incorrectActionModal.classList.remove('hidden');
                tempActionStore = chosenAction; // Store the user's action
            }
        };

        const continueHand = (chosenAction) => {
            const activeHandObj = state.playerHands[state.activeHandIndex];
            const activeHand = activeHandObj.cards;
            
            updateScoreDisplay();

            if (!activeHandObj.actionInfo) {
                const correctAction = getCorrectAction(activeHand, state.dealerHand[0], state.settings);
                activeHandObj.actionInfo = { chosen: chosenAction, correct: correctAction, isIncorrectMove: chosenAction !== correctAction };
            }
            
            if (chosenAction === 'D') activeHandObj.isDoubled = true;

            if (chosenAction === 'P') {
                const [card1, card2] = activeHand;
                const isAces = card1.startsWith('A');
                const newCard1 = state.currentDeck.pop();
                const newCard2 = state.currentDeck.pop();
                updateCount(newCard1);
                updateCount(newCard2);
                
                const parentHandId = activeHandObj.handId;

                state.playerHands.splice(state.activeHandIndex, 1, 
                    { handId: Date.now() + 1, originId: parentHandId, cards: [card1, newCard1], actionInfo: null, isDoubled: false, result: null, finalTotal: 0, isSplitAce: isAces }, 
                    { handId: Date.now() + 2, originId: parentHandId, cards: [card2, newCard2], actionInfo: null, isDoubled: false, result: null, finalTotal: 0, isSplitAce: isAces }
                );
                
                renderHands(false, true); // Re-render for split

                if (isAces) {
                    setTimeout(() => endCurrentHand(), 1000);
                } else {
                    updateActionButtons();
                    if (getHandTotal(state.playerHands[state.activeHandIndex].cards).total === 21) setTimeout(endCurrentHand, 1000);
                }
                return;
            }
            
            if (chosenAction === 'H' || chosenAction === 'D') {
                 const newCard = state.currentDeck.pop();
                 updateCount(newCard);
                 activeHand.push(newCard);
                 
                // Append card instead of re-rendering
                if (!state.isSimulating) {
                    const activeHandContainer = app.playerHandEl.children[state.activeHandIndex];
                    const handCardsEl = activeHandContainer.querySelector('.hand-cards');
                    const cardHtml = renderCard(newCard);
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = cardHtml;
                    const newCardEl = tempDiv.firstElementChild;
                    if(newCardEl) {
                        newCardEl.classList.add('added-card');
                        handCardsEl.appendChild(newCardEl);
                    }
                }
            }
            
            if (chosenAction === 'H') {
                 if (getHandTotal(activeHand).total >= 21) {
                    setTimeout(endCurrentHand, 1000);
                } else {
                    updateActionButtons();
                }
                return;
            }

            if (chosenAction === 'D') {
                setTimeout(endCurrentHand, 1000);
                return;
            }
            
            endCurrentHand();
        };
        
        const endCurrentHand = () => {
            state.activeHandIndex++;
            if (state.activeHandIndex < state.playerHands.length) {
                renderHands();
                updateActionButtons();
                if (getHandTotal(state.playerHands[state.activeHandIndex].cards).total === 21 && !state.playerHands[state.activeHandIndex].isSplitAce) {
                    setTimeout(() => endCurrentHand(), 1500);
                }
            } else {
                playOutRound();
            }
        };

        const updateBettingOnResult = (winAmount) => {
            for (const key in state.betting) {
                const strat = state.betting[key];
                strat.runningTotal += winAmount * strat.currentBet;
                strat.maxGain = Math.max(strat.maxGain, strat.runningTotal);
                strat.maxLoss = Math.min(strat.maxLoss, strat.runningTotal);
            }

            const prog = state.betting.progressive;
            if (prog) {
                if (winAmount > 0) prog.progressionIndex = (prog.progressionIndex + 1) % prog.progression.length;
                else if (winAmount < 0) prog.progressionIndex = 0;
            }

            const customProg = state.betting.custom;
            if (customProg) {
                if (winAmount > 0) customProg.progressionIndex = (customProg.progressionIndex + 1) % customProg.progression.length;
                else if (winAmount < 0) customProg.progressionIndex = 0;
            }
            
            const mart = state.betting.martingale;
            if (mart) {
                if (winAmount < 0) mart.currentBet = Math.min(mart.currentBet * 2, state.settings.maxBet);
                else if (winAmount > 0) mart.currentBet = 1;
            }
            
            const dalembert = state.betting.dalembert;
            if(dalembert) {
                if (winAmount < 0) dalembert.currentBet = Math.min(dalembert.currentBet + 1, state.settings.maxBet);
                else if (winAmount > 0) dalembert.currentBet = Math.max(1, dalembert.currentBet - 1);
            }
        };

        const playOutBlackjackRound = async (playerHasBlackjack, dealerHasBlackjack) => {
            if (!state.isSimulating) app.actionControls.querySelectorAll('button:not(#simulate-shoe-btn)').forEach(btn => btn.disabled = true);
            updateCount(state.dealerHand[1]);
            
            let outcome, handWinAmount;

            if (playerHasBlackjack && !dealerHasBlackjack) {
                outcome = 'win';
                handWinAmount = 1.5;
            } else if (playerHasBlackjack && dealerHasBlackjack) {
                outcome = 'push';
                handWinAmount = 0;
            } else if (!playerHasBlackjack && dealerHasBlackjack) {
                outcome = 'loss';
                handWinAmount = -1;
            }
            
            if(outcome === 'win') state.wins++;
            else if(outcome === 'loss') state.losses++;
            else if(outcome === 'push') state.pushes++;

            updateBettingOnResult(handWinAmount);

            state.playerHands[0].result = outcome.toUpperCase();
            state.playerHands[0].finalTotal = getHandTotal(state.playerHands[0].cards).total;
            const dealerFinalTotal = getHandTotal(state.dealerHand).total;
            
            if(!state.isSimulating) {
                renderHands(true, true);
                app.dealerTotalEl.textContent = dealerFinalTotal;
                updateScoreDisplay();
                updateBettingDisplay();
                await delay(2000);
                hideBlackjackGraphic();
                dealNewHand();
            } else {
                 dealNewHand();
            }
        };

        const playOutRound = async () => {
            if (!state.isSimulating) app.actionControls.querySelectorAll('button:not(#simulate-shoe-btn)').forEach(btn => btn.disabled = true);
            
            updateCount(state.dealerHand[1]);
            if (!state.isSimulating) {
                const cardEl = app.dealerHandEl.children[1];
                if (cardEl) {
                    const newCardHtml = renderCard(state.dealerHand[1]);
                    cardEl.outerHTML = newCardHtml;
                    const newCardEl = app.dealerHandEl.children[1];
                    if(newCardEl) newCardEl.classList.add('flipped-card');
                }
                await delay(750);
            }

            const playerAllBustedOrSurrendered = state.playerHands.every(hand => {
                const total = getHandTotal(hand.cards).total;
                const surrendered = hand.actionInfo && hand.actionInfo.chosen === 'R';
                return total > 21 || surrendered;
            });
            
            let dealerTotalInfo = getHandTotal(state.dealerHand);

            if(!playerAllBustedOrSurrendered) {
                while (dealerTotalInfo.total < 17 || (dealerTotalInfo.total === 17 && dealerTotalInfo.soft && state.settings.dealerOnSoft17 === 'h17')) {
                    const newCard = state.currentDeck.pop();
                    updateCount(newCard);
                    state.dealerHand.push(newCard);
                    if (!state.isSimulating) {
                        const cardHtml = renderCard(newCard);
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = cardHtml;
                        const newCardEl = tempDiv.firstElementChild;
                        if(newCardEl) {
                            newCardEl.classList.add('added-card');
                            app.dealerHandEl.appendChild(newCardEl);
                        }
                        await delay(750);
                    }
                    dealerTotalInfo = getHandTotal(state.dealerHand);
                }
            }

            const dealerFinalTotal = dealerTotalInfo.total;
            
            const initialActionInfo = state.playerHands[0].actionInfo;
            let totalRoundWinAmount = 0;

            state.playerHands.forEach((handObj) => {
                const playerFinalTotal = getHandTotal(handObj.cards).total;
                handObj.finalTotal = playerFinalTotal;
                let outcome;
                let handWinAmount = 1;

                if (initialActionInfo && initialActionInfo.chosen === 'R') { 
                     outcome = 'loss'; 
                     handWinAmount = -0.5;
                } else if (playerFinalTotal > 21) {
                    outcome = 'loss'; 
                    handWinAmount = -1;
                } else if (dealerFinalTotal > 21 || playerFinalTotal > dealerFinalTotal) {
                    outcome = 'win'; 
                    handWinAmount = 1;
                } else if (playerFinalTotal < dealerFinalTotal) {
                    outcome = 'loss'; 
                    handWinAmount = -1;
                } else {
                    outcome = 'push'; 
                    handWinAmount = 0;
                }
                
                handObj.result = outcome.toUpperCase();
                if (handObj.isDoubled) handWinAmount *= 2;
                totalRoundWinAmount += handWinAmount;
                
                if (outcome === 'win') state.wins++; else if (outcome === 'loss') state.losses++; else state.pushes++;

                // Update mistake log with the final result
                const mistakeLogId = handObj.originId || handObj.handId;
                const mistake = state.incorrectHandsLog.find(log => log.handId === mistakeLogId);
                if(mistake) {
                    if (!mistake.handResult) {
                        mistake.handResult = [];
                    }
                    mistake.handResult.push(handObj.result);
                }
            });

            updateBettingOnResult(totalRoundWinAmount);
            if (!state.isSimulating) {
                renderHands(true, false);
                app.dealerTotalEl.textContent = dealerFinalTotal;
                updateScoreDisplay();
                updateBettingDisplay();
                setTimeout(dealNewHand, 2000);
            } else {
                dealNewHand();
            }
        };

        const playAutoHand = () => {
            while (state.activeHandIndex < state.playerHands.length) {
                let currentHandObj = state.playerHands[state.activeHandIndex];
                let currentHand = currentHandObj.cards;
                while (getHandTotal(currentHand).total < 21 && !currentHandObj.isSplitAce) {
                    const correctAction = getCorrectAction(currentHand, state.dealerHand[0], state.settings);
                    if (!currentHandObj.actionInfo) {
                        state.correctCount++;
                        currentHandObj.actionInfo = { chosen: correctAction, correct: correctAction, isIncorrectMove: false };
                    }
                    if (correctAction === 'S' || correctAction === 'R') break;
                    if (correctAction === 'D') {
                        currentHandObj.isDoubled = true;
                        currentHand.push(state.currentDeck.pop());
                        updateCount(currentHand[currentHand.length - 1]);
                        break;
                    }
                    if (correctAction === 'H') {
                        currentHand.push(state.currentDeck.pop());
                        updateCount(currentHand[currentHand.length - 1]);
                    }
                    if (correctAction === 'P') {
                        const [card1, card2] = currentHand;
                        const isAces = card1.startsWith('A');
                        const newCard1 = state.currentDeck.pop();
                        const newCard2 = state.currentDeck.pop();
                        updateCount(newCard1);
                        updateCount(newCard2);
                        
                        const parentHandId = currentHandObj.handId;

                        state.playerHands.splice(state.activeHandIndex, 1, 
                            { handId: Date.now() + 1, originId: parentHandId, cards: [card1, newCard1], actionInfo: null, isDoubled: false, result: null, finalTotal: 0, isSplitAce: isAces }, 
                            { handId: Date.now() + 2, originId: parentHandId, cards: [card2, newCard2], actionInfo: null, isDoubled: false, result: null, finalTotal: 0, isSplitAce: isAces }
                        );
                        
                        if(isAces) {
                            // First split Ace hand is done. Increment index to move to the second.
                            state.activeHandIndex++;
                        }

                        currentHandObj = state.playerHands[state.activeHandIndex];
                        currentHand = currentHandObj.cards;
                        continue;
                    }
                }
                state.activeHandIndex++;
            }
            playOutRound();
        };


        const updateScoreDisplay = () => {
            app.correctCountEl.textContent = state.correctCount;
            app.incorrectCountEl.textContent = state.incorrectCount;
            app.winCountEl.textContent = state.wins;
            app.lossCountEl.textContent = state.losses;
            app.pushCountEl.textContent = state.pushes;
        };

        const updateBettingDisplay = () => {
            let html = '';
            for (const key in state.betting) {
                const strat = state.betting[key];
                html += `
                    <tr>
                        <td class="text-left font-semibold">${strat.name}</td>
                        <td class="font-bold ${strat.runningTotal > 0 ? 'text-green-600' : (strat.runningTotal < 0 ? 'text-red-600' : '')}">${strat.runningTotal.toFixed(2)}</td>
                        <td>${strat.currentBet}</td>
                        <td class="text-green-600">${strat.maxGain.toFixed(2)}</td>
                        <td class="text-red-600">${strat.maxLoss.toFixed(2)}</td>
                    </tr>
                `;
            }
            app.bettingTableBody.innerHTML = html;
        };

        const generateChart = () => {
            const dealerCards = ['2','3','4','5','6','7','8','9','T','A'];
            let html = '';

            const createTable = (title, handType, totals) => {
                let tableHtml = `<h3 class="text-xl font-bold mt-4 mb-2">${title}</h3><table class="strategy-table w-full border-collapse"><thead><tr><th></th>`;
                dealerCards.forEach(d => tableHtml += `<th>${d === 'T' ? '10' : d}</th>`);
                tableHtml += '</tr></thead><tbody>';

                totals.forEach(playerTotal => {
                    if (handType === 'hard') {
                      tableHtml += `<tr><td>${playerTotal}</td>`;
                    } else if (handType === 'soft') {
                        const secondCardValue = playerTotal - 11;
                        const secondCardStr = secondCardValue === 10 ? 'T' : String(secondCardValue);
                        tableHtml += `<tr><td>A,${secondCardStr}</td>`;
                    } else {
                        tableHtml += `<tr><td>${playerTotal},${playerTotal}</td>`;
                    }
                    dealerCards.forEach(dealerCard => {
                        let testHand;
                        if (handType === 'hard') {
                            const hardTotalsMap = { 5: ['2S', '3C'], 6: ['2S', '4C'], 7: ['3S', '4C'], 8: ['3S', '5C'], 9: ['4S', '5C'], 10: ['6S', '4C'], 11: ['6S', '5C'], 12: ['TS', '2C'], 13: ['TS', '3C'], 14: ['TS', '4C'], 15: ['TS', '5C'], 16: ['TS', '6C'], 17: ['TS', '7C'] };
                            testHand = hardTotalsMap[playerTotal];
                        } else if (handType === 'soft') {
                            const secondCardValue = playerTotal - 11;
                            const secondCardStr = secondCardValue === 10 ? 'T' : String(secondCardValue);
                            testHand = [`AS`, `${secondCardStr}C`];
                        } else { 
                            const cardValue = playerTotal === 'T' ? 'T' : (playerTotal === 'A' ? 'A' : playerTotal);
                            testHand = [`${cardValue}S`, `${cardValue}C`];
                        }
                        
                        const action = getCorrectAction(testHand, `${dealerCard}S`, state.settings, true);
                        tableHtml += `<td class="action-${action}">${action}</td>`;
                    });
                    tableHtml += '</tr>';
                });
                tableHtml += '</tbody></table>';
                return tableHtml;
            };

            html += createTable('Hard Totals', 'hard', [17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5]);
            html += createTable('Soft Totals', 'soft', [20, 19, 18, 17, 16, 15, 14, 13]);
            html += createTable('Pairs', 'pairs', ['A', 'T', 9, 8, 7, 6, 5, 4, 3, 2]);

            app.chartContainer.innerHTML = html;
        };

        const getStrategyExplanation = (hand) => {
            const { playerHand, dealerCard, correctAction } = hand;
            const { total: playerTotal, soft: isSoft } = getHandTotal(playerHand);
            const dealerValue = getCardValue(dealerCard);
            const isPair = playerHand.length === 2 && getCardValue(playerHand[0]) === getCardValue(playerHand[1]);

            if (isPair) {
                const pairValue = playerHand[0].slice(0, -1).replace(/[JQK]/, 'T');
                if (pairValue === 'A' || pairValue === '8') return "You should always split Aces and 8s. A pair of 8s is a total of 16, the worst hand in blackjack. Splitting gives you two much stronger hands starting with 8. A pair of Aces becomes two powerful hands starting with 11.";
                if (pairValue === 'T' || pairValue === '5') return "You should never split 10s or 5s. A total of 20 is already a winning hand, and a total of 10 is a great hand to double down on, not split.";
            }

            if (correctAction === 'S') {
                if (playerTotal >= 17 && !isSoft) return `A hard total of ${playerTotal} is a strong hand. You should stand and make the dealer try to beat you, as the risk of busting if you hit is too high.`;
                if (playerTotal >= 13 && playerTotal <= 16 && (dealerValue >= 2 && dealerValue <= 6)) return `You have a 'stiff' hand (${playerTotal}), which can bust with one card. Since the dealer's up-card is a '${dealerValue}' (a bust card), the correct strategy is to stand and let the dealer take the risk of busting.`;
            }

            if (correctAction === 'H') {
                if (playerTotal <= 11) return `With a total of ${playerTotal}, you cannot bust by hitting. Hitting will always improve your hand or give you a better total to play from.`;
                if (playerTotal >= 12 && playerTotal <= 16 && (dealerValue >= 7)) return `Your hand (${playerTotal}) is weak, and the dealer's strong up-card (${dealerValue}) means they are likely to make a strong hand. You must hit to improve your total for a better chance to win.`;
            }

            if (correctAction === 'D') {
                if (playerTotal === 11) return "A total of 11 is the best possible starting hand. Doubling down maximizes your potential profit in this highly advantageous situation.";
                if (playerTotal === 10 && dealerValue <= 9) return "A total of 10 is a very strong hand, especially against a dealer's non-10 up-card. Doubling down is the best way to capitalize on this advantage.";
                if (isSoft) return `Soft totals like yours (${playerTotal}) are great for doubling because you can't bust. If you get a low card, you have a strong total. If you get a high card, the Ace converts to 1, giving you a second chance.`;
            }

            if (correctAction === 'P') return "Splitting this pair is mathematically better than hitting or standing, giving you a higher expected return in the long run.";
            if (correctAction === 'R') return `Your hand (${playerTotal}) is extremely weak against the dealer's up-card (${dealerValue}). Surrendering saves half your bet in a situation where you are very likely to lose the whole bet.`;

            return 'This is the mathematically optimal play based on computer simulations of millions of hands.';
        };


        // --- Event Listeners & UI Management ---
        const updateSettingsUI = () => {
            app.settingButtons.forEach(btn => {
                btn.classList.toggle('bg-indigo-600', state.settings[btn.dataset.setting] === btn.dataset.value);
                btn.classList.toggle('text-white', state.settings[btn.dataset.setting] === btn.dataset.value);
                btn.classList.toggle('bg-gray-200', state.settings[btn.dataset.setting] !== btn.dataset.value);
                btn.classList.toggle('text-gray-700', state.settings[btn.dataset.setting] !== btn.dataset.value);
            });
            app.decksSelect.value = state.settings.decks;
            app.maxBetSelect.value = state.settings.maxBet;
            app.customProgressionInput.value = state.settings.customProgression.join(',');
        };
        
        const showView = (viewToShow) => {
            [app.settingsView, app.trainingView, app.chartView].forEach(view => view.classList.add('hidden'));
            viewToShow.classList.remove('hidden');
        };

        app.settingButtons.forEach(btn => btn.addEventListener('click', e => {
             const { setting, value } = e.target.dataset;
             if(setting && value) { state.settings[setting] = value; updateSettingsUI(); }
        }));
        app.decksSelect.addEventListener('change', e => {
            state.settings.decks = parseInt(e.target.value);
        });
        app.maxBetSelect.addEventListener('change', e => {
            state.settings.maxBet = parseFloat(e.target.value);
        });
        app.actionControls.addEventListener('click', handleAction);
        
        app.startTrainingBtn.addEventListener('click', () => {
            initState();

            app.settingButtons.forEach(btn => {
                if(btn.classList.contains('bg-indigo-600')) {
                    state.settings[btn.dataset.setting] = btn.dataset.value;
                }
            });
            state.settings.decks = parseInt(app.decksSelect.value);
            state.settings.maxBet = parseFloat(app.maxBetSelect.value);
            const customProgValue = app.customProgressionInput.value;
            if (customProgValue) {
                state.settings.customProgression = customProgValue.split(/[,-]/)
                    .map(s => parseInt(s.trim()))
                    .filter(n => !isNaN(n) && n > 0);
            } else {
                 state.settings.customProgression = [];
            }
            
            state.betting = initBettingStrategies();
            
            showView(app.trainingView);
            app.countDisplay.classList.add('hidden');
            app.toggleCountBtn.textContent = 'Show Count';
            app.bettingDisplay.classList.add('hidden');
            app.toggleBettingBtn.textContent = 'Show Betting Stats';
            app.simulateShoeBtn.disabled = false;
            updateScoreDisplay();
            updateCountDisplay();
            updateBettingDisplay();
            createFullDeck();
            shuffleDeck();
            dealNewHand();
        });

        app.simulateShoeBtn.addEventListener('click', () => {
            state.isSimulating = true;
            app.simulateShoeBtn.disabled = true;
            app.actionControls.querySelectorAll('button:not(#simulate-shoe-btn)').forEach(btn => btn.disabled = true);
            playAutoHand();
        });


        app.viewChartBtn.addEventListener('click', () => { generateChart(); showView(app.chartView); });
        app.backToSettings.addEventListener('click', () => showView(app.settingsView));
        app.backToSettingsFromChart.addEventListener('click', () => showView(app.settingsView));
        
        app.toggleCountBtn.addEventListener('click', () => {
            state.showCount = !state.showCount;
            app.countDisplay.classList.toggle('hidden');
            app.toggleCountBtn.textContent = state.showCount ? 'Hide Count' : 'Show Count';
        });

        app.toggleBettingBtn.addEventListener('click', () => {
            state.showBetting = !state.showBetting;
            app.bettingDisplay.classList.toggle('hidden');
            app.toggleBettingBtn.textContent = state.showBetting ? 'Hide Betting Stats' : 'Show Betting Stats';
        });

        app.shuffleBtn.addEventListener('click', () => {
            app.endOfShoeModal.classList.add('hidden');
            shuffleDeck();
            dealNewHand();
        });

        app.backToMenuBtn.addEventListener('click', () => {
            app.endOfShoeModal.classList.add('hidden');
            showView(app.settingsView);
        });

        app.acknowledgeIncorrectBtn.addEventListener('click', () => {
            app.incorrectActionModal.classList.add('hidden');
            if (tempActionStore) {
                continueHand(tempActionStore);
                tempActionStore = null;
            }
        });
        
        const populateReviewModal = () => {
            const mistake = state.incorrectHandsLog[state.reviewIndex];
            app.reviewCountEl.textContent = `${state.reviewIndex + 1} of ${state.incorrectHandsLog.length}`;
            app.reviewPlayerHandEl.innerHTML = mistake.playerHand.map((card, index) => renderCard(card)).join('');
            app.reviewDealerCardEl.innerHTML = renderCard(mistake.dealerCard);
            app.reviewUserActionEl.textContent = getActionName(mistake.userAction);
            app.reviewCorrectActionEl.textContent = getActionName(mistake.correctAction);
            app.reviewExplanationEl.textContent = getStrategyExplanation(mistake);

            const resultText = mistake.handResult ? mistake.handResult.join(' / ') : 'N/A';
            app.reviewOutcomeResultEl.textContent = resultText;
            
            if (mistake.handResult && mistake.handResult.includes("WIN")) {
                app.reviewOutcomeNoteEl.textContent = "(You got lucky!)";
                app.reviewOutcomeResultEl.className = "font-bold text-green-600";
            } else if (mistake.handResult && mistake.handResult.includes("LOSS")) {
                app.reviewOutcomeNoteEl.textContent = "(The wrong move cost you.)";
                app.reviewOutcomeResultEl.className = "font-bold text-red-600";
            } else {
                 app.reviewOutcomeNoteEl.textContent = "";
                 app.reviewOutcomeResultEl.className = "font-bold text-gray-700";
            }

            app.reviewPrevBtn.disabled = state.reviewIndex === 0;
            app.reviewNextBtn.classList.toggle('hidden', state.reviewIndex === state.incorrectHandsLog.length - 1);
            app.finishReviewBtn.classList.toggle('hidden', state.reviewIndex !== state.incorrectHandsLog.length - 1);
        };

        app.reviewMistakesBtn.addEventListener('click', () => {
            state.reviewIndex = 0;
            app.endOfShoeModal.classList.add('hidden');
            populateReviewModal();
            app.reviewModal.classList.remove('hidden');
        });

        app.reviewNextBtn.addEventListener('click', () => {
            if (state.reviewIndex < state.incorrectHandsLog.length - 1) {
                state.reviewIndex++;
                populateReviewModal();
            }
        });

        app.reviewPrevBtn.addEventListener('click', () => {
            if (state.reviewIndex > 0) {
                state.reviewIndex--;
                populateReviewModal();
            }
        });

        app.finishReviewBtn.addEventListener('click', () => {
            app.reviewModal.classList.add('hidden');
            app.reviewMistakesBtn.classList.add('hidden');
            app.endOfShoeMessage.textContent = "You've reviewed your mistakes. Ready for the next shoe?";
            app.endOfShoeModal.classList.remove('hidden');
        });

        initState();
        updateSettingsUI();
        showView(app.settingsView);
    });
