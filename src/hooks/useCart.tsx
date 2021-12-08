import { Product, Stock } from '../types';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { api } from '../services/api';
import { toast } from 'react-toastify';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = window.localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  // useEffect(() => {
  //   const saveCart = JSON.stringify(cart);
  //   window.localStorage.setItem('@RocketShoes:cart', saveCart)
  //   console.log(cart)
  // }, [cart])

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.find((product) => product.id === productId);

      const stock = await api.get<Stock>(`/stock/${productId}`)
      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      if (productExists) {
        productExists.amount = amount; 
      } else {
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex((product) => {
        return product.id === productId
      })
      const products = cart.filter((product) => product.id !== productId)

      if (productIndex < 0) {
        throw new Error('Erro na remoção do produto')
      }

      setCart(products)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: productStockAmount } = await api.get<Stock>(`/stock/${productId}`)
      
      if (productStockAmount.amount < amount) {
        throw new RangeError('Quantidade solicitada fora de estoque')
      }

      if (amount <= 0 ) {
        throw new Error()
      }

      const productIndex = cart.findIndex((product) => {
        return product.id === productId
      })

      const tempCart = [...cart];
      tempCart[productIndex].amount = amount;
      setCart(tempCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(tempCart))
    } catch(err) {
      if (err instanceof RangeError) {
        toast.error('Quantidade solicitada fora de estoque')
      } else {
        toast.error('Erro na alteração de quantidade do produto')
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
