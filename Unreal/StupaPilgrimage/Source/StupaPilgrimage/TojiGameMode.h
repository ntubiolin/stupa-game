#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "TojiSave.h"
#include "TojiGameMode.generated.h"

class ADirectionalLight;
class ASkyLight;
class ATojiCharacter;
class UStaticMeshComponent;

UCLASS()
class STUPAPILGRIMAGE_API ATojiGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    ATojiGameMode();
    virtual void StartPlay() override;
    virtual void Tick(float DeltaSeconds) override;
    virtual AActor* ChoosePlayerStart_Implementation(AController* Player) override;

    void Interact(ATojiCharacter& Pilgrim);
    void Cast(ATojiCharacter& Pilgrim);
    void ChangeLanguage();
    void ShowImportFolder();
    void ImportFromFolder();
    void SetTimeOfDay(int32 Time);
    int32 GetTimeOfDay() const { return TimeOfDay; }

    FText Text(const TCHAR* English, const TCHAR* Chinese) const;
    FText ObjectiveText() const;
    FText PromptText() const;
    FText NoticeText() const;
    FText TimeText() const;
    bool IsEnglish() const { return Progress.bEnglish; }

private:
    FTojiProgress Progress;

    UPROPERTY()
    TObjectPtr<AActor> Marker;

    UPROPERTY()
    TObjectPtr<AActor> Shade;

    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> Flame;

    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> Pulse;

    UPROPERTY()
    TObjectPtr<ADirectionalLight> Sun;

    UPROPERTY()
    TObjectPtr<ASkyLight> SkyLight;

    FRotator DaySunRotation;
    float DayIntensity = 0;
    float DaySkyIntensity = 1;
    float DayTemperature = 6500;
    bool bDayUseTemperature = false;
    FColor DaySunColor = FColor::White;
    int32 TimeOfDay = 0;
    float NoticeRemaining = 0;
    float ConfirmImportRemaining = 0;
    float ShadeAge = 0;
    float AttackRemaining = 0;
    float PulseRemaining = 0;
    bool bInDialogue = false;
    int32 ShadeHealth = 0;
    FText NoticeEnglish;
    FText NoticeChinese;

    void SetNotice(const TCHAR* English, const TCHAR* Chinese, float Seconds = 4);
    void Advance();
    void RefreshQuest();
    void StopEncounter();
    void ImportFile(const FString& Path);
    void FindLights();
    bool IsNearObjective(const ATojiCharacter& Pilgrim) const;
    AActor* SpawnFigureRoot(const FVector& At, const FRotator& Rotation = FRotator::ZeroRotator);
    const ATojiCharacter* Pilgrim() const;
};
