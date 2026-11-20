#pragma once

#include "Widgets/SCompoundWidget.h"
#include "Fonts/SlateFontInfo.h"

class ATibetGameMode;
class ATibetHUD;
enum class ETibetPage : uint8 { Play, Map, Skills, Controls, Pack, Dedication };

class STibetPlayOverlay : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(STibetPlayOverlay) {}
        SLATE_ARGUMENT(ATibetGameMode*, Mode)
        SLATE_ARGUMENT(ATibetHUD*, HUD)
        SLATE_ARGUMENT(bool, Touch)
    SLATE_END_ARGS()
    void Construct(const FArguments& Args);
    FSlateFontInfo Font(int32 Size) const;
    bool IsTouch() const { return bTouch; }
    void Show(ETibetPage Page);
    virtual bool SupportsKeyboardFocus() const override { return Page!=ETibetPage::Play; }
    virtual FReply OnKeyDown(const FGeometry& Geometry,const FKeyEvent& Key) override;
private:
    TWeakObjectPtr<ATibetGameMode> Mode;
    TWeakObjectPtr<ATibetHUD> HUD;
    TWeakPtr<SWidget> DedicationFields;
    TSharedPtr<const FCompositeFont> Typeface;
    ETibetPage Page = ETibetPage::Play;
    bool bTouch = false;
    float Width() const;
    float Height() const;
    float LayoutScale() const;
    FText Local(const TCHAR* English, const TCHAR* Chinese) const;
    TSharedRef<SWidget> Label(TAttribute<FText> Value, int32 Size, FLinearColor Color) const;
    TSharedRef<SWidget> Button(TAttribute<FText> Name, FSimpleDelegate Action, bool Highlight = false, FName Tag = NAME_None) const;
    TSharedRef<SWidget> CourtyardControls();
    TSharedRef<SWidget> FeedingMenu();
    TSharedRef<SWidget> Dedication();
    TSharedRef<SWidget> Play();
    TSharedRef<SWidget> Journal();
    TSharedRef<SWidget> SkillSlot(int32 Index);
    TSharedRef<SWidget> Skills();
    TSharedRef<SWidget> Controls();
    TSharedRef<SWidget> Pack();
    TSharedRef<SWidget> QuickSlot();
    FString SkillStatus(int32 Index) const;
};
