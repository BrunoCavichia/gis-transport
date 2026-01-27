"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Car, Package, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VehicleType } from "@/lib/types";

interface VehicleItemProps {
    id: string | number;
    type: VehicleType;
    isSelected: boolean;
    onSelect: (id: string | number) => void;
    onRemove: (id: string | number) => void;
}

export const VehicleItem = memo(function VehicleItem({
    id,
    type,
    isSelected,
    onSelect,
    onRemove,
}: VehicleItemProps) {
    return (
        <div
            onClick={() => onSelect(id)}
            className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                isSelected
                    ? "bg-primary/5 border-primary/50 shadow-sm"
                    : "bg-card border-transparent hover:bg-accent/50",
            )}
        >
            <div className="flex items-center gap-3">
                <div
                    className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                        isSelected ? "bg-primary text-white" : "bg-muted",
                    )}
                >
                    <Car className="h-4 w-4" />
                </div>
                <div>
                    <p className="text-xs font-bold">{type.label}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                        {String(id).split('-').pop()?.slice(0, 6)}
                    </p>
                </div>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(id);
                }}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
});

interface JobItemProps {
    id: string | number;
    label: string;
    onRemove: (id: string | number) => void;
}

export const JobItem = memo(function JobItem({
    id,
    label,
    onRemove,
}: JobItemProps) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-transparent hover:border-border transition-all group">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Package className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold">{label}</span>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(id)}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
});
