#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "GameFramework/SaveGame.h"
#include "TibetPlayerFeedback.h"
#include "TibetPack.h"
#include "TibetGameMode.generated.h"

USTRUCT()
struct FTibetDedication
{
    GENERATED_BODY()
    UPROPERTY(SaveGame) FString Pilgrim;
    UPROPERTY(SaveGame) FString Prayer;
};

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
    UPROPERTY(SaveGame) int32 Equipment = 0;
    UPROPERTY(SaveGame) int32 PillCharges = 4;
    UPROPERTY(SaveGame) bool bQuickMap = false;
    UPROPERTY(SaveGame) float SolarPhase = .30f;
    UPROPERTY(SaveGame) int32 ClockRate = 1;
    UPROPERTY(SaveGame) uint8 ButterLampMask = 0;
    UPROPERTY(SaveGame) TArray<FTibetDedication> Dedications;
    UPROPERTY(SaveGame) int32 MonkeysFed = 0;
    UPROPERTY(SaveGame) int32 FeedingBest = 0;
    UPROPERTY(SaveGame) int32 FeedingPlays = 0;
    UPROPERTY(SaveGame) bool bMessengerJoined = false;
};

struct FTibetDamageCue
{
    FVector Origin;
    int32 Amount;
    float SpawnTime;
};

struct FTibetEnemyMeter
{
    FVector Anchor = FVector::ZeroVector;
    int32 Health = 0, Maximum = 0;
    float Trailing = 0;
};

struct FTibetSkillState
{
    FString Name, Binding;
    float Cost = 0, CooldownRemaining = 0, CooldownDuration = 0, ActiveRemaining = 0;
    bool bUnlocked = false;
};

struct FTibetWildEnemy
{
    TWeakObjectPtr<AActor> Actor;
    int32 Kind = 0;
    int32 Health = 3;
    float StunnedUntil = 0.f;
};

UCLASS()
class TIBETPILGRIMAGE_API ATibetGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    ATibetGameMode();
    virtual void StartPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type Reason) override;
    bool GetInteractionCue(FVector& WorldAnchor) const;
    FString DialoguePage() const;
    const FString& DialogueSpeaker() const { return Speaker; }
    bool HasSpokenWord() const { return bSpokenWord; }
    void PauseDialogue(bool Paused);
    void StopDialogue();
    virtual void Tick(float DeltaSeconds) override;
    float SolarPhase() const { return Save ? Save->SolarPhase : .30f; }
    int32 ClockRate() const { return Save ? Save->ClockRate : 1; }
    void SetClockRate(int32 Rate);
    void SetSolarPhase(float Phase, bool bCommit=true);
    FString TimeLabel() const;
    bool CanFeed() const;
    bool AtButterLamp() const;
    void OfferNearbyLamp();
    void QuickPractice();
    TConstArrayView<FTibetDedication> Dedications() const
    {
        if (Save) return Save->Dedications;
        return {};
    }
    bool InscribeDedication(const FString& Pilgrim, const FString& Prayer);
    bool MacaquePrompt(FVector& Position,int32& Meters) const;
    void BeginFeeding();
    void CloseFeeding();
    void QuickFeed();
    void StartFruitGame();
    void PickFruit(int32 Fruit);
    int32 FeedingPanel() const { return FeedPanel; }
    int32 RequestedFruit() const { return FruitRequest; }
    int32 FedCount() const { return Save ? Save->MonkeysFed : 0; }
    int32 BestFeedingScore() const { return Save ? Save->FeedingBest : 0; }
    FString FeedingText() const;
    FString FruitName(int32 Fruit) const;
    FVector GetObjectiveLocation() const;
    FString GetObjectiveText() const;
    FName GetObjectiveKind() const;
    int32 GetStep() const;
    int32 GetStepProgress() const;
    bool IsCampaignComplete() const { return Save && Save->bComplete; }
    void Interact();
    void CastSkill(int32 Slot = 0);
    FTibetSkillState GetSkillState(int32 Slot) const;
    bool GetEnemyMeter(FTibetEnemyMeter& Meter) const;
    const TArray<FTibetDamageCue>& GetDamageCues() const { return DamageCues; }
    float GetMana() const { return Mana; }
    float MaxHealth() const;
    float MaxMana() const;
    bool OwnsItem(ETibetItem Item) const;
    bool IsEquipped(ETibetItem Item) const;
    ETibetItem QuickItem() const;
    void SetQuickItem(ETibetItem Item);
    void ToggleEquipment(ETibetItem Item);
    void UsePill();
    int32 Pills() const;
    float GetHealth() const { return Health; }
    const FTibetPlayerFeedback& GetPlayerFeedback() const { return PlayerFeedback; }
    void ChangeLanguage();
    FString AreaName() const;
    int32 CurrentAreaIndex() const;
    FString AreaName(int32 Index) const;
    bool HasVisitedArea(int32 Index) const;
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
    UPROPERTY() TMap<FName, TObjectPtr<AActor>> Residents;
    FString Map, Route, SlotName;
    TMap<FName, FVector> PassageSockets;
    int32 LitCaveLamps = 0;
    uint8 SpawnedLampMask = 0;
    UPROPERTY() TObjectPtr<class ATibetMacaques> Macaques;
    UPROPERTY() TObjectPtr<class ATibetSkyClock> OutdoorSky;
    int32 FeedPanel=0, FeedTarget=INDEX_NONE, FruitRequest=INDEX_NONE, FruitRound=0, FruitScore=0, FruitAffection=0;
    bool LastFruitMatched=false, bFedThisSession=false;
    float SinceClockSave=0, SinceSkyUpdate=0;
    void RewardFeeding();
    void StartCourtyard();
    void RefreshScore();
    FTimerHandle ScoreTimer;
    FName ScoreName;
    UPROPERTY() TObjectPtr<class UAudioComponent> ScorePlayer;
    void UpdateClock(float Dt);
    void OfferButter(int32 Lamp, bool bOpenDedication);
    float LastButterOffer = -1.f;
    int32 NearestButterLamp(const FVector& Where) const;
    int32 FurthestMap = INDEX_NONE;
    bool HasLearnedSkill(int32 Slot) const;
    int32 EnemyHealth = 0, EnemyMaximum = 0;
    float EnemyTrailing = 0, LastHitTime = -10, FinishTime = -10;
    FTibetEnemyMeter FinishingMeter;
    TArray<FTibetWildEnemy> WildernessPack;
    void RefreshWilderness(int32 Remaining);
    void UpdateWilderness(const FVector& Player, float Dt);
    FString EnemyLabel() const;
    float PursuitSpeed(bool bBoss) const;
    bool bEnemyWindingUp = false;
    TWeakObjectPtr<class ATibetRitualEffect> WindupEffect;
    void CancelEnemyWindup();
    void UpdateEnemyAttack(APawn& Player, bool bBoss, float Dt);
    FTibetPlayerFeedback PlayerFeedback;
    TArray<FTibetDamageCue> DamageCues;
    float Health = 100, Mana = 100, HurtTimer = 0, Stun = 0, Shield = 0, NoticeUntil = 0;
    float Cooldown[7]{};
    FString Notice;
    FString Speaker, Dialogue;
    TArray<int32> PageStarts;
    int32 DialogueIndex = INDEX_NONE, PageIndex = 0;
    uint32 VoiceGeneration = 0;
    double PageDeadline = 0;
    bool bSpokenWord = false, bDialoguePaused = false, bVoicePending = false, bVoiceRequested = false;
    void StartDialogueVoice();
    void BeginDialogue(int32 ObjectiveIndex);
    void TickDialogue();
    void SetDialogueWord(int32 Offset);
    UPROPERTY() TObjectPtr<AActor> SideGate;
    bool ClearSight(const FVector& From, const FVector& To, const AActor* Target) const;
    bool bTravel = false, bEscorting = false;
    AActor* MeshActor(const FVector& Position, const FString& MeshPath, const FVector& Scale,
        const FLinearColor* Color = nullptr);
    FVector Anchor() const;
    void PopulateResidents();
    AActor* ActiveResident() const;
    void RestoreStupaFlames();
    void Refresh();
    void Advance();
    ETibetItem LastPackReward = ETibetItem::Count;
    float PackRewardUntil = 0;
    float NextPill = 0;
    TArray<float> HealTicks;
    void UpdatePills(float Now);
    bool Store();
    void MoveToNextMap();
    void SetNotice(const FString& Line);
    void Pulse(const FVector& At, const FLinearColor& Color, float Magnitude);
};

