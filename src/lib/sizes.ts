export const isPant = (category?: string | null) =>
  /pant|flare/i.test(category || '');

export const getSizes = (category?: string | null) =>
  isPant(category)
    ? ['29', '30', '31', '32', '33', '34', '35', '36']
    : ['S', 'M', 'L', 'XL'];

export const SIZE_ORDER = ['S', 'M', 'L', 'XL', '29', '30', '31', '32', '33', '34', '35', '36'];
