import { DISCOUNT_RATES, POINTS, PRODUCT_IDS } from '../constant';
import { State } from '../types';

export const getIsTuesday = () => new Date().getDay() === 2;

export const getProducts = (state: State) => state.products;
export const getCartList = (state: State) => state.cartList;
export const getNotifications = (state: State) => state.notifications;

export const getCartDetails = (state: State) => {
  const products = getProducts(state);
  const cartList = getCartList(state);
  return cartList.map((cartItem) => {
    const product = products.find((p) => p.id === cartItem.productId);

    return {
      ...cartItem,
      product,
      itemTotal: (product?.price ?? 0) * cartItem.quantity,
    };
  });
};

export const getTotalQuantity = (state: State) => {
  const cartDetails = getCartDetails(state);
  return cartDetails.reduce((sum, item) => sum + item.quantity, 0);
};

export const getSubtotal = (state: State) => {
  const cartDetails = getCartDetails(state);
  return cartDetails.reduce((sum, item) => sum + item.itemTotal, 0);
};

export const getDiscountResult = (state: State) => {
  const cartDetails = getCartDetails(state);
  const subtotal = getSubtotal(state);
  const totalQuantity = getTotalQuantity(state);
  const isTuesday = getIsTuesday();

  const baseDiscountRules = [
    {
      condition: totalQuantity >= 30,
      apply: () => ({
        total: subtotal * (1 - DISCOUNT_RATES.BULK),
        details: [{ reason: '🎉 대량구매 할인 (30개 이상)', amount: '25%' }],
      }),
    },
    {
      condition: true,
      apply: () => {
        const details: { reason: string; amount: string }[] = [];
        const total = cartDetails.reduce((acc, item) => {
          let itemDiscountRate = 0;
          const individualDiscount = DISCOUNT_RATES.INDIVIDUAL[item.productId];
          if (item.quantity >= 10 && individualDiscount) {
            itemDiscountRate = individualDiscount;
            details.push({
              reason: `${item.product?.name} (10개↑)`,
              amount: `${itemDiscountRate * 100}%`,
            });
          }
          return acc + item.itemTotal * (1 - itemDiscountRate);
        }, 0);
        return { total, details };
      },
    },
  ];

  const { total: totalAfterBaseDiscount, details: baseDiscountDetails } = baseDiscountRules
    .find((rule) => rule.condition)
    ?.apply() ?? { total: subtotal, details: [] };

  let finalTotal = totalAfterBaseDiscount;
  const finalDiscountDetails = [...baseDiscountDetails];

  if (isTuesday && finalTotal > 0) {
    finalTotal *= 1 - DISCOUNT_RATES.TUESDAY;
    finalDiscountDetails.push({ reason: '🌟 화요일 추가 할인', amount: '10%' });
  }

  return { finalTotal, discounts: finalDiscountDetails };
};

export const getStockMessages = (state: State) => {
  const products = getProducts(state);
  return products
    .filter((p) => p.quantity < 5)
    .map((p) =>
      p.quantity > 0 ? `${p.name}: 재고 부족 (${p.quantity}개 남음)\n` : `${p.name}: 품절\n`,
    );
};

export const getBonusPoints = (state: State) => {
  const totalQuantity = getTotalQuantity(state);
  if (totalQuantity === 0) return { bonusPoints: 0, pointsDetail: [] };

  const { finalTotal } = getDiscountResult(state);
  const basePoints = Math.floor(finalTotal / 1000);
  const isTuesday = getIsTuesday();

  const has = (productId: string) =>
    getCartList(state).some((item) => item.productId === productId);
  const hasKeyboard = has(PRODUCT_IDS.P1);
  const hasMouse = has(PRODUCT_IDS.P2);
  const hasMonitorArm = has(PRODUCT_IDS.P3);

  const cumulativeRules = [
    {
      condition: isTuesday && basePoints > 0,
      points: basePoints,
      detail: '화요일 2배',
    },
    {
      condition: hasKeyboard && hasMouse,
      points: POINTS.COMBO_KEYBOARD_MOUSE,
      detail: `키보드+마우스 세트 +${POINTS.COMBO_KEYBOARD_MOUSE}p`,
    },
    {
      condition: hasKeyboard && hasMouse && hasMonitorArm,
      points: POINTS.FULL_SET,
      detail: `풀세트 구매 +${POINTS.FULL_SET}p`,
    },
  ];

  const exclusiveRules = [
    {
      condition: totalQuantity >= 30,
      points: POINTS.BULK_L3,
      detail: `대량구매(30개+) +${POINTS.BULK_L3}p`,
    },
    {
      condition: totalQuantity >= 20,
      points: POINTS.BULK_L2,
      detail: `대량구매(20개+) +${POINTS.BULK_L2}p`,
    },
    {
      condition: totalQuantity >= 10,
      points: POINTS.BULK_L1,
      detail: `대량구매(10개+) +${POINTS.BULK_L1}p`,
    },
  ];

  const activeCumulativeBonuses = cumulativeRules.filter((rule) => rule.condition);

  const activeExclusiveBonus = exclusiveRules.find((rule) => rule.condition);

  const allActiveBonuses = [...activeCumulativeBonuses];
  if (activeExclusiveBonus) {
    allActiveBonuses.push(activeExclusiveBonus);
  }

  const totalBonusPoints = allActiveBonuses.reduce((sum, rule) => sum + rule.points, basePoints);

  const pointsDetail = basePoints > 0 ? [`기본: ${basePoints}p`] : [];
  allActiveBonuses.forEach((rule) => pointsDetail.push(rule.detail));

  return { bonusPoints: totalBonusPoints, pointsDetail };
};
