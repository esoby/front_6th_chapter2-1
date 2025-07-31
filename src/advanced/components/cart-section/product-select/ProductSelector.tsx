import { ProductOption } from './ProductOption';

export const ProductSelector = () => (
  <select
    id='product-select'
    className='w-full p-3 border border-gray-300 rounded-lg text-base mb-3'
  >
    <ProductOption product={undefined} />
  </select>
);
