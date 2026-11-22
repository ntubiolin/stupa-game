#include "../TibetGameMode.h"

#if WITH_DEV_AUTOMATION_TESTS
#include "Components/PointLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "Kismet/GameplayStatics.h"
#include "Misc/AutomationTest.h"
#include "UObject/Package.h"

struct FTibetMangyulTestAccessor
{
    static void Configure(ATibetGameMode& Mode, UTibetSave* Save, float Mana,
        const FString& Map = FString(), const FString& Route = FString(), const FString& Slot = FString())
    {
        Mode.Save = Save;
        Mode.Mana = Mana;
        Mode.Map = Map;
        Mode.Route = Route.IsEmpty() ? Map : Route;
        if (!Slot.IsEmpty()) Mode.SlotName = Slot;
    }

    static void Refresh(ATibetGameMode& Mode)
    {
        Mode.Refresh();
    }

    static void Advance(ATibetGameMode& Mode)
    {
        Mode.Advance();
    }

    static AActor* GetFocus(const ATibetGameMode& Mode)
    {
        return Mode.Focus;
    }
};

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetMangyulAltarCoordinatesTest, "Tibet.Mangyul.AltarCoordinateParity",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetMangyulAltarCoordinatesTest::RunTest(const FString&)
{
    // Exact parity with Tools/tibet_landscapes.py camp() Tenma altars:
    // east = side * (8.2 + (row % 2) * 2.4), north = -9.0 + row * 4.2 -> UE (north*100, east*100, 0).
    auto* Save = NewObject<UTibetSave>();
    Save->Map = TEXT("mangyul");
    Save->Steps.Add(TEXT("mangyul"), 1);

    auto* Mode = NewObject<ATibetGameMode>();
    FTibetMangyulTestAccessor::Configure(*Mode, Save, 100.f, TEXT("mangyul"), TEXT("mangyul"));

    for (int32 Index = 0; Index < ATibetGameMode::MangyulAltarCount; ++Index)
    {
        const int32 Row = Index / 2;
        const double Side = (Index % 2) ? 1.0 : -1.0;
        const FVector Expected(-900.0 + Row * 420.0, Side * (820.0 + (Row % 2) * 240.0), 0.0);

        const FVector Actual = ATibetGameMode::MangyulAltarLocation(Index);
        TestTrue(FString::Printf(TEXT("Altar %d static helper matches authored pass rock"), Index),
            Actual.Equals(Expected, 1e-3));

        Save->Counts.Add(TEXT("mangyul"), Index);
        TestTrue(FString::Printf(TEXT("Mangyul step 1 progress %d objective anchor matches altar %d"), Index, Index),
            Mode->GetObjectiveLocation().Equals(Expected, 1e-3));
    }
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetMangyulOathStoneSpawnAndRestoreTest, "Tibet.Mangyul.OathStonesSpawnAndRestore",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetMangyulOathStoneSpawnAndRestoreTest::RunTest(const FString&)
{
    TestNotNull(TEXT("GEngine available"), GEngine);
    if (!GEngine) return false;

    const FString Slot = TEXT("TibetPilgrimage-UnitTest-MangyulAltars");
    UGameplayStatics::DeleteGameInSlot(Slot, 0);

    UWorld* World = UWorld::CreateWorld(EWorldType::Game, false, TEXT("TibetMangyulAltarTestWorld"), GetTransientPackage());
    TestNotNull(TEXT("Transient game world created"), World);
    if (!World) return false;
    FWorldContext& WorldContext = GEngine->CreateNewWorldContext(EWorldType::Game);
    WorldContext.SetCurrentWorld(World);

    auto* Save = NewObject<UTibetSave>(World);
    Save->Map = TEXT("mangyul");
    Save->Steps.Add(TEXT("mangyul"), 1);
    Save->Counts.Add(TEXT("mangyul"), 0);

    auto* Mode = World->SpawnActor<ATibetGameMode>();
    TestNotNull(TEXT("Spawned ATibetGameMode in transient world"), Mode);
    if (Mode)
    {
        FTibetMangyulTestAccessor::Configure(*Mode, Save, 100.f, TEXT("mangyul"), TEXT("mangyul"), Slot);
        FTibetMangyulTestAccessor::Refresh(*Mode);

        // Initial state before placing any Oath Stone: 0 Oath Stones, active Focus at Altar 0 (Z = 0) with elevated crown.
        TArray<AActor*> Stones;
        UGameplayStatics::GetAllActorsWithTag(World, TEXT("TenmaOathStone"), Stones);
        TestEqual(TEXT("No Oath Stones spawned before first altar interaction"), Stones.Num(), 0);
        TestEqual(TEXT("PlacedTenmaStones starts at 0"), Mode->GetPlacedTenmaStoneCount(), 0);

        AActor* InitialFocus = FTibetMangyulTestAccessor::GetFocus(*Mode);
        TestNotNull(TEXT("Active altar Focus beacon spawned"), InitialFocus);
        if (InitialFocus)
        {
            TestTrue(TEXT("Active altar Focus root stays at Z=0 for floor/range checks"),
                InitialFocus->GetActorLocation().Equals(ATibetGameMode::MangyulAltarLocation(0), 1e-3));
            TArray<UPointLightComponent*> FocusLights;
            InitialFocus->GetComponents<UPointLightComponent>(FocusLights);
            TestEqual(TEXT("Altar Focus adds zero PointLights"), FocusLights.Num(), 0);

            TArray<UStaticMeshComponent*> FocusMeshes;
            InitialFocus->GetComponents<UStaticMeshComponent>(FocusMeshes);
            bool bHasElevatedCrown = false;
            for (const UStaticMeshComponent* MeshComp : FocusMeshes)
            {
                if (MeshComp && MeshComp->GetRelativeLocation().Z >= 115.0) bHasElevatedCrown = true;
            }
            TestTrue(TEXT("Altar Focus includes elevated crown above 115cm rock"), bHasElevatedCrown);
        }

        // Advance through all 12 Tenma altars one by one: each placement must spawn a visible Oath Stone atop that altar.
        for (int32 I = 0; I < ATibetGameMode::MangyulAltarCount; ++I)
        {
            FTibetMangyulTestAccessor::Advance(*Mode);
            TestEqual(FString::Printf(TEXT("PlacedTenmaStones after altar %d"), I),
                Mode->GetPlacedTenmaStoneCount(), I + 1);

            Stones.Reset();
            UGameplayStatics::GetAllActorsWithTag(World, TEXT("TenmaOathStone"), Stones);
            TestEqual(FString::Printf(TEXT("World contains %d TenmaOathStone actors"), I + 1), Stones.Num(), I + 1);

            const FName ExpectedTag(*FString::Printf(TEXT("TenmaOathStone_%d"), I));
            AActor* NewStone = nullptr;
            for (AActor* Candidate : Stones)
            {
                if (Candidate && Candidate->ActorHasTag(ExpectedTag)) { NewStone = Candidate; break; }
            }
            TestNotNull(FString::Printf(TEXT("Found TenmaOathStone_%d actor"), I), NewStone);
            if (NewStone)
            {
                const FVector ExpectedTop = ATibetGameMode::MangyulAltarLocation(I) + FVector(0.0, 0.0, 116.0);
                TestTrue(FString::Printf(TEXT("TenmaOathStone_%d perched atop altar %d at Z=116"), I, I),
                    NewStone->GetActorLocation().Equals(ExpectedTop, 1e-2));

                TArray<UStaticMeshComponent*> StoneMeshes;
                NewStone->GetComponents<UStaticMeshComponent>(StoneMeshes);
                TestTrue(FString::Printf(TEXT("TenmaOathStone_%d has carved stele & seal meshes"), I),
                    StoneMeshes.Num() >= 6);

                TArray<UPointLightComponent*> StoneLights;
                NewStone->GetComponents<UPointLightComponent>(StoneLights);
                TestEqual(FString::Printf(TEXT("TenmaOathStone_%d maintains 0 PointLights"), I), StoneLights.Num(), 0);
            }

            if (I + 1 < ATibetGameMode::MangyulAltarCount)
            {
                TestEqual(TEXT("Still on step 1 while altars remain"), Mode->GetStep(), 1);
                TestEqual(TEXT("Step progress advances"), Mode->GetStepProgress(), I + 1);
                TestTrue(TEXT("Next objective moves to next Tenma altar"),
                    Mode->GetObjectiveLocation().Equals(ATibetGameMode::MangyulAltarLocation(I + 1), 1e-3));
            }
            else
            {
                TestEqual(TEXT("Twelfth altar advances Mangyul to step 2 (Pass Latse)"), Mode->GetStep(), 2);
                TestEqual(TEXT("Step progress resets to 0 on step 2"), Mode->GetStepProgress(), 0);
            }
        }
    }

    GEngine->DestroyWorldContext(World);
    World->DestroyWorld(false);

    // Reload verification in a fresh world: saved Mangyul progress >= Step 2 restores all 12 Oath Stones immediately!
    UWorld* ReloadWorld = UWorld::CreateWorld(EWorldType::Game, false, TEXT("TibetMangyulReloadTestWorld"), GetTransientPackage());
    TestNotNull(TEXT("Reload game world created"), ReloadWorld);
    if (ReloadWorld)
    {
        FWorldContext& ReloadCtx = GEngine->CreateNewWorldContext(EWorldType::Game);
        ReloadCtx.SetCurrentWorld(ReloadWorld);

        auto* DiskSave = Cast<UTibetSave>(UGameplayStatics::LoadGameFromSlot(Slot, 0));
        TestNotNull(TEXT("Loaded saved Mangyul slot from disk"), DiskSave);
        auto* ReloadMode = ReloadWorld->SpawnActor<ATibetGameMode>();
        if (DiskSave && ReloadMode)
        {
            FTibetMangyulTestAccessor::Configure(*ReloadMode, DiskSave, 100.f, TEXT("mangyul"), TEXT("mangyul"), Slot);
            FTibetMangyulTestAccessor::Refresh(*ReloadMode);

            TArray<AActor*> RestoredStones;
            UGameplayStatics::GetAllActorsWithTag(ReloadWorld, TEXT("TenmaOathStone"), RestoredStones);
            TestEqual(TEXT("Reloading Mangyul at step 2 restores all 12 Tenma Oath Stones"),
                RestoredStones.Num(), ATibetGameMode::MangyulAltarCount);

            // Completing step 5 (Pass Latse prayer flags) spawns MangyulLatseFlags with 0 PointLights.
            DiskSave->Steps.Add(TEXT("mangyul"), 5);
            DiskSave->Counts.Add(TEXT("mangyul"), 0);
            FTibetMangyulTestAccessor::Refresh(*ReloadMode);
            FTibetMangyulTestAccessor::Advance(*ReloadMode);

            TArray<AActor*> LatseFlags;
            UGameplayStatics::GetAllActorsWithTag(ReloadWorld, TEXT("MangyulLatseFlags"), LatseFlags);
            TestEqual(TEXT("Completing step 5 spawns Pass Latse five-color prayer flags"), LatseFlags.Num(), 1);
            if (LatseFlags.Num() == 1 && LatseFlags[0])
            {
                TArray<UPointLightComponent*> FlagLights;
                LatseFlags[0]->GetComponents<UPointLightComponent>(FlagLights);
                TestEqual(TEXT("Pass Latse flags maintain 0 PointLights"), FlagLights.Num(), 0);
            }
        }

        GEngine->DestroyWorldContext(ReloadWorld);
        ReloadWorld->DestroyWorld(false);
    }

    UGameplayStatics::DeleteGameInSlot(Slot, 0);
    return true;
}
#endif
