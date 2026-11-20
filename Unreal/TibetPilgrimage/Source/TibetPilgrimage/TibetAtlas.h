#pragma once

#include "Fonts/SlateFontInfo.h"
#include "Widgets/SCompoundWidget.h"
#include "UObject/StrongObjectPtr.h"

class ATibetGameMode;
class UTexture2D;

class STibetAtlas final : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(STibetAtlas) {}
        SLATE_ARGUMENT(ATibetGameMode*, Mode)
        SLATE_ARGUMENT(FSlateFontInfo, Font)
        SLATE_ARGUMENT(bool, Compact)
        SLATE_ARGUMENT(float, Width)
        SLATE_ARGUMENT(float, Height)
    SLATE_END_ARGS()
    void Construct(const FArguments& Args);
private:
    TWeakObjectPtr<ATibetGameMode> Mode;
    TStrongObjectPtr<UTexture2D> Texture;
    FSlateBrush Illustration;
    int32 Selected = 0;
    bool bWriteFailed = false;
    FString SelectedLegend() const;
};
