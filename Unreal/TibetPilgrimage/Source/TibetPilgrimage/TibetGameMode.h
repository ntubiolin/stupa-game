#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "GameFramework/SaveGame.h"
#include "TibetGameMode.generated.h"

UCLASS()
class TIBETPILGRIMAGE_API UTibetSave : public USaveGame
{
    GENERATED_BODY()
public:
    UPROPERTY(SaveGame) TMap<FString, int32> Steps;
    UPROPERTY(SaveGame) TMap<FString, int32> Counts;
    UPROPERTY(SaveGame) FString Map;
    UPROPERTY(SaveGame) bool bEnglish = false;
    UPROPERTY(SaveGame) bool bReturnFromTerma = false;
    UPROPERTY(SaveGame) bool bEpilogue = false;
    UPROPERTY(SaveGame) bool bComplete = false;
};

UCLASS()
class TIBETPILGRIMAGE_API ATibetGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    ATibetGameMode();
    virtual void StartPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    FVector GetObjectiveLocation() const;
    FString GetObjectiveText() const;
    FName GetObjectiveKind() const;
    int32 GetStep() const;
    int32 GetStepProgress() const;
    bool IsCampaignComplete() const { return Save && Save->bComplete; }
    void Interact();
    void CastSkill(int32 Slot = 0);
    void ChangeLanguage();
    FString AreaName() const;
    FString Status(bool bTouchControls) const;
    bool IsEnglish() const { return Save && Save->bEnglish; }
    FString Local(const TCHAR* En, const TCHAR* Zh) const { return IsEnglish() ? En : Zh; }
private:
    enum class EInteraction { None, Grove, Gate, Talk, Use };
    EInteraction InteractionAt(const FVector& PlayerLocation) const;
    FString ActionLabel(EInteraction Action) const;
    UPROPERTY() TObjectPtr<class UMaterialInterface> RitualMaterial;
    UPROPERTY() TObjectPtr<UTibetSave> Save;
    UPROPERTY() TObjectPtr<AActor> Focus;
    UPROPERTY() TObjectPtr<AActor> Messenger;
    FString Map, Route, SlotName;
    int32 LitStupaLamps = 0;
    int32 EnemyHealth = 0;
    float Health = 100, Mana = 100, HurtTimer = 0, Stun = 0, Shield = 0, NoticeUntil = 0;
    float Cooldown[7]{};
    FString Notice;
    bool bTravel = false, bEscorting = false;
    AActor* MeshActor(const FVector& Position, const FString& MeshPath, const FVector& Scale,
        const FLinearColor* Color = nullptr);
    FVector Anchor() const;
    void RestoreStupaFlames();
    void Refresh();
    void Advance();
    void Store();
    void MoveToNextMap();
    void SetNotice(const FString& Line);
    void Pulse(const FVector& At, const FLinearColor& Color, float Magnitude);
};

