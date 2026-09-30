import { BalanceCard } from "../ui/BalanceCard";

interface LiquiditySourcesDeckProps {
  hideBalance?: boolean;
}

export function LiquiditySourcesDeck({ hideBalance = false }: LiquiditySourcesDeckProps) {
  return (
    <div className="w-full">
      <BalanceCard hideBalance={hideBalance} />
    </div>
  );
}
