"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info, ShieldAlert, CheckCircle2 } from "lucide-react";

import { RouteNotice, RouteData } from "@/lib/types";

export interface RouteError {
    vehicleId: string;
    errorMessage: string;
}

interface RouteErrorAlertProps {
    errors: RouteError[];
    notices?: RouteNotice[];
    onClear: () => void;
}

export function RouteErrorAlert({ errors = [], notices = [], onClear }: RouteErrorAlertProps) {
    const hasData = (errors && errors.length > 0) || (notices && notices.length > 0);

    if (!hasData) return null;

    const isGlobalFailure = errors.length > 0;

    return (
        <Dialog open={hasData} onOpenChange={(open) => !open && onClear()}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl bg-background">
                <div className="bg-gradient-to-br from-muted/50 via-background to-background p-6">
                    <DialogHeader className="mb-6">
                        <div className="flex items-center gap-3 mb-1">
                            <div className={`p-2 rounded-xl ${isGlobalFailure ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                                {isGlobalFailure ? (
                                    <ShieldAlert className="h-5 w-5 text-red-600" />
                                ) : (
                                    <Info className="h-5 w-5 text-amber-600" />
                                )}
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold tracking-tight">
                                    {isGlobalFailure ? "Optimization Results" : "Routing Insights"}
                                </DialogTitle>
                                <DialogDescription className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">
                                    Fleet performance & restrictions report
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {/* Errors Section */}
                        {errors.map((error, idx) => (
                            <div key={`err-${idx}`} className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 space-y-1">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-xs font-black uppercase tracking-wider text-red-600/80">
                                        {error.vehicleId === "Unassigned" ? "Unassigned Job" : `Vehicle ${error.vehicleId}`}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed pl-6">
                                    {error.errorMessage}
                                </p>
                            </div>
                        ))}

                        {/* Notices Section */}
                        {notices.map((notice, idx) => (
                            <div key={`note-${idx}`} className={`p-4 rounded-xl border space-y-1 ${notice.type === 'warning' ? 'border-amber-500/20 bg-amber-500/5' :
                                notice.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/5' :
                                    'border-primary/10 bg-primary/5'
                                }`}>
                                <div className="flex items-center gap-2">
                                    {notice.type === 'warning' ? <AlertCircle className="h-4 w-4 text-amber-500" /> :
                                        notice.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                                            <Info className="h-4 w-4 text-primary/70" />}
                                    <span className={`text-xs font-black uppercase tracking-wider ${notice.type === 'warning' ? 'text-amber-600/80' :
                                        notice.type === 'success' ? 'text-emerald-600/80' :
                                            'text-primary/70'
                                        }`}>
                                        {notice.title}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed pl-6">
                                    {notice.message}
                                </p>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="mt-8">
                        <Button
                            onClick={onClear}
                            className="w-full h-11 font-bold shadow-lg transition-all active:scale-98"
                        >
                            Got it
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
