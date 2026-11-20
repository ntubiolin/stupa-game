#pragma once

#include "GameFramework/HUD.h"
#include "TojiHUD.generated.h"

class SWidget;

UCLASS()
class STUPAPILGRIMAGE_API ATojiHUD : public AHUD
{
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
    TSharedPtr<SWidget> Overlay;
};
