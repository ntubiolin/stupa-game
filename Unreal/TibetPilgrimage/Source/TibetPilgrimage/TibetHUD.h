#pragma once

#include "GameFramework/HUD.h"
#include "TibetHUD.generated.h"

UCLASS()
class TIBETPILGRIMAGE_API ATibetHUD : public AHUD
{
    GENERATED_BODY()
    TSharedPtr<class SWidget> Overlay;
protected:
    virtual void DrawHUD() override;
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type Reason) override;
};
