#pragma once

#include "GameFramework/HUD.h"
#include "TibetHUD.generated.h"

class STibetPlayOverlay;
enum class ETibetPage : uint8;

UCLASS()
class TIBETPILGRIMAGE_API ATibetHUD : public AHUD
{
    GENERATED_BODY()
public:
    void ToggleJournal(ETibetPage Page);
    void CloseJournal();
    bool HasDrawnInteractionCue() const { return bDrewInteraction; }
    bool IsJournalOpen() const;
    ETibetPage GetJournalPage() const { return Page; }
protected:
    virtual void DrawHUD() override;
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type Reason) override;
private:
    TSharedPtr<STibetPlayOverlay> Overlay;
    ETibetPage Page{};
    bool bCursorBeforeJournal = false;
    bool bDrewInteraction = false;
    bool bPausedByJournal = false;
};
