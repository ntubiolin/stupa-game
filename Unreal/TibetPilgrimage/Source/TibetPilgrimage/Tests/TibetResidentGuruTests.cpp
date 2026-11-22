#include "../TibetGameMode.h"
#include "../TibetGuruHalo.h"

#if WITH_DEV_AUTOMATION_TESTS
#include "Components/PointLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/Material.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Misc/AutomationTest.h"
#include "Misc/PackageName.h"
#include "ProceduralMeshComponent.h"

namespace
{
struct FTestPlacement
{
    const TCHAR* Map;
    const TCHAR* Id;
    const TCHAR* Model;
    FVector Home;
    const TCHAR* Marker = nullptr;
};

const FTestPlacement TestCastPlacements[] = {
#include "../TibetResidents.inl"
};
}

struct FTibetResidentTestAccessor
{
    static void Configure(ATibetGameMode& Mode, UTibetSave* Save, const FString& MapName, const FString& RouteName = FString())
    {
        Mode.Save = Save;
        Mode.Map = MapName;
        Mode.Route = RouteName.IsEmpty() ? MapName : RouteName;
        if (!Mode.RitualMaterial)
        {
            Mode.RitualMaterial = FPackageName::DoesPackageExist(TEXT("/Game/Figures/Materials/M_RitualColor"))
                ? LoadObject<UMaterialInterface>(nullptr, TEXT("/Game/Figures/Materials/M_RitualColor.M_RitualColor"))
                : UMaterial::GetDefaultMaterial(MD_Surface);
        }
    }

    static void PopulateResidents(ATibetGameMode& Mode)
    {
        if (FPackageName::DoesPackageExist(TEXT("/Game/Figures/Guide")))
        {
            Mode.PopulateResidents();
            return;
        }
        Mode.Residents.Empty();
        Mode.ResidentStates.Reset();
        for (const FTestPlacement& Entry : TestCastPlacements)
        {
            if (Mode.Map != Entry.Map) continue;
            FVector Location = Entry.Home;
            Location.Z = Mode.GroundHeight(Location);
            AActor* Actor = Mode.MeshActor(Location, TEXT("/Engine/BasicShapes/Cylinder.Cylinder"), FVector::OneVector);
            if (!Actor) continue;
            Actor->SetActorRotation(FRotator(0.f, -90.f, 0.f));
            Actor->Tags.Add(TEXT("TibetResident"));
            Actor->Tags.Add(FName(Entry.Id));
            Mode.Residents.Add(FName(Entry.Id), Actor);
            Mode.RegisterSpawnedResident(FName(Entry.Id), Actor, Location, Entry.Marker != nullptr);
        }
    }
    static void UpdateResidentVisibility(ATibetGameMode& Mode) { Mode.UpdateResidentVisibility(); }
    static void UpdateResidents(ATibetGameMode& Mode, float Dt, const FVector* PilgrimPos = nullptr)
    {
        Mode.UpdateResidents(Dt, PilgrimPos);
    }
    static void EnsureSkyGuru(ATibetGameMode& Mode) { Mode.EnsureSkyGuru(); }
    static void UpdateSkyGuruRadiance(ATibetGameMode& Mode, float Now) { Mode.UpdateSkyGuruRadiance(Now); }

    static AActor* FindResident(const ATibetGameMode& Mode, FName Id)
    {
        return Mode.Residents.FindRef(Id).Get();
    }

    static const TArray<FTibetResidentState>& GetStates(const ATibetGameMode& Mode) { return Mode.ResidentStates; }
    static AActor* GetSkyGuru(const ATibetGameMode& Mode) { return Mode.SkyGuru.Get(); }
    static ATibetGuruHalo* GetSkyGuruHalo(const ATibetGameMode& Mode) { return Mode.SkyGuruHalo.Get(); }

    static void CleanupMode(ATibetGameMode* Mode)
    {
        if (!Mode) return;
        for (const FTibetResidentState& State : Mode->ResidentStates)
        {
            if (auto* Halo = State.GuruHalo.Get()) Halo->Destroy();
            if (auto* Actor = State.Actor.Get()) Actor->Destroy();
        }
        Mode->ResidentStates.Reset();
        Mode->Residents.Empty();
        if (Mode->SkyGuruHalo) { Mode->SkyGuruHalo->Destroy(); Mode->SkyGuruHalo = nullptr; }
        if (Mode->SkyGuru) { Mode->SkyGuru->Destroy(); Mode->SkyGuru = nullptr; }
        if (Mode->SkyGuruMandala) { Mode->SkyGuruMandala->Destroy(); Mode->SkyGuruMandala = nullptr; }
        Mode->Destroy();
    }
};

namespace
{
UWorld* FindAutomationWorld()
{
    if (!GEngine) return nullptr;
    for (const FWorldContext& Context : GEngine->GetWorldContexts())
    {
        if (Context.World() && (Context.WorldType == EWorldType::Editor || Context.WorldType == EWorldType::Game || Context.WorldType == EWorldType::PIE))
            return Context.World();
    }
    return nullptr;
}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetGuruVisionGatingTest, "Tibet.Resident.GuruVisionManifestationGating",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetGuruVisionGatingTest::RunTest(const FString&)
{
    auto* Save = NewObject<UTibetSave>();
    auto* Mode = NewObject<ATibetGameMode>();

    // Non-Guru residents are always manifested.
    FTibetResidentTestAccessor::Configure(*Mode, Save, TEXT("stupa"));
    TestFalse(TEXT("oldLama is not a GuruVision id"), ATibetGameMode::IsGuruVisionId(TEXT("oldLama")));
    TestTrue(TEXT("oldLama is always manifested"), Mode->IsGuruVisionManifested(TEXT("oldLama")));

    // 1. Pharping: hidden for steps 0..5, manifested at step >= 6 (after lighting all 7 Yangleshö lamps).
    FTibetResidentTestAccessor::Configure(*Mode, Save, TEXT("pharping"));
    for (int32 Step = 0; Step <= 5; ++Step)
    {
        Save->Steps.Add(TEXT("pharping"), Step);
        TestFalse(FString::Printf(TEXT("guruVision.pharping hidden at step %d"), Step),
            Mode->IsGuruVisionManifested(TEXT("guruVision.pharping")));
    }
    Save->Steps.Add(TEXT("pharping"), 6);
    TestTrue(TEXT("guruVision.pharping manifests at step 6"), Mode->IsGuruVisionManifested(TEXT("guruVision.pharping")));

    // 2. Mangyul: hidden for steps 0..3, manifested at step >= 4 (after subduing Twelve Tenma storm).
    FTibetResidentTestAccessor::Configure(*Mode, Save, TEXT("mangyul"));
    for (int32 Step = 0; Step <= 3; ++Step)
    {
        Save->Steps.Add(TEXT("mangyul"), Step);
        TestFalse(FString::Printf(TEXT("guruVision.mangyul hidden at step %d"), Step),
            Mode->IsGuruVisionManifested(TEXT("guruVision.mangyul")));
    }
    Save->Steps.Add(TEXT("mangyul"), 4);
    TestTrue(TEXT("guruVision.mangyul manifests at step 4"), Mode->IsGuruVisionManifested(TEXT("guruVision.mangyul")));

    // 3. Yarlung: hidden for steps 0..4, manifested at step >= 5 (when Herder Dawa spots Guru Vision on the pasture).
    FTibetResidentTestAccessor::Configure(*Mode, Save, TEXT("yarlung"));
    for (int32 Step = 0; Step <= 4; ++Step)
    {
        Save->Steps.Add(TEXT("yarlung"), Step);
        TestFalse(FString::Printf(TEXT("guruVision.yarlung hidden at step %d"), Step),
            Mode->IsGuruVisionManifested(TEXT("guruVision.yarlung")));
    }
    Save->Steps.Add(TEXT("yarlung"), 5);
    TestTrue(TEXT("guruVision.yarlung manifests at step 5"), Mode->IsGuruVisionManifested(TEXT("guruVision.yarlung")));

    // 4. Return / Epilogue / Complete states keep Pure Vision manifested on return visits.
    Save->Steps.Empty();
    Save->bReturnFromTerma = true;
    FTibetResidentTestAccessor::Configure(*Mode, Save, TEXT("yarlung"));
    TestTrue(TEXT("guruVision.yarlung stays manifested during return from Terma"),
        Mode->IsGuruVisionManifested(TEXT("guruVision.yarlung")));

    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetGuruVisionLevitationAndHaloTest, "Tibet.Resident.GuruVisionLevitationAndHalo",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetGuruVisionLevitationAndHaloTest::RunTest(const FString&)
{
    UWorld* World = FindAutomationWorld();
    TestNotNull(TEXT("Automation world exists"), World);
    if (!World) return false;

    auto* Save = NewObject<UTibetSave>();
    Save->Steps.Add(TEXT("yarlung"), 0);
    auto* Mode = World->SpawnActor<ATibetGameMode>();
    TestNotNull(TEXT("Spawned GameMode"), Mode);
    if (!Mode) return false;

    FTibetResidentTestAccessor::Configure(*Mode, Save, TEXT("yarlung"));
    FTibetResidentTestAccessor::PopulateResidents(*Mode);

    AActor* Guru = FTibetResidentTestAccessor::FindResident(*Mode, TEXT("guruVision.yarlung"));
    AActor* Herder = FTibetResidentTestAccessor::FindResident(*Mode, TEXT("herder"));
    TestNotNull(TEXT("Spawned guruVision.yarlung actor"), Guru);
    TestNotNull(TEXT("Spawned herder actor"), Herder);

    if (Guru && Herder)
    {
        // QA invariant: RootComponent of every TibetResident must remain UStaticMeshComponent with valid StaticMesh.
        const auto* GuruBody = Cast<UStaticMeshComponent>(Guru->GetRootComponent());
        const auto* HerderBody = Cast<UStaticMeshComponent>(Herder->GetRootComponent());
        TestNotNull(TEXT("GuruVision RootComponent is UStaticMeshComponent"), GuruBody);
        TestNotNull(TEXT("Herder RootComponent is UStaticMeshComponent"), HerderBody);
        if (GuruBody) TestNotNull(TEXT("GuruVision StaticMesh is assigned"), GuruBody->GetStaticMesh().Get());

        // Yarlung GuruVision moved to northern Alpine Pasture edge (680, -320).
        TestNearlyEqual(TEXT("Yarlung GuruVision X at northern pasture edge"), float(Guru->GetActorLocation().X), 680.f, 1.f);
        TestNearlyEqual(TEXT("Yarlung GuruVision Y at northern pasture edge"), float(Guru->GetActorLocation().Y), -320.f, 1.f);

        // Hidden at step 0, while Herder is visible.
        TestTrue(TEXT("guruVision.yarlung hidden at step 0"), Guru->IsHidden());
        TestFalse(TEXT("Herder visible at step 0"), Herder->IsHidden());

        // Attached ATibetGuruHalo is also hidden at step 0 and contains 0 PointLights.
        ATibetGuruHalo* Halo = nullptr;
        for (const FTibetResidentState& State : FTibetResidentTestAccessor::GetStates(*Mode))
            if (State.Id == TEXT("guruVision.yarlung")) Halo = State.GuruHalo.Get();
        TestNotNull(TEXT("ATibetGuruHalo attached to guruVision.yarlung"), Halo);
        if (Halo)
        {
            TestEqual(TEXT("Halo attach parent is GuruVision"), Halo->GetAttachParentActor(), Guru);
            TestTrue(TEXT("Halo hidden while GuruVision is hidden"), Halo->IsHidden());
            TestFalse(TEXT("Halo does not force absolute rotation"), Halo->GetRootComponent()->IsUsingAbsoluteRotation());
            TestTrue(TEXT("Halo built vertical head & body mandala sections"), Halo->GetTotalSectionCount() >= 6);
            TestNull(TEXT("Halo maintains 0 PointLights"), Halo->FindComponentByClass<UPointLightComponent>());
            if (const auto* HeadHalo = Halo->GetHeadHaloComponent())
            {
                TestNearlyEqual(TEXT("Head halo centered behind head at Z=162 cm"), float(HeadHalo->GetRelativeLocation().Z), 162.f, 0.5f);
                TestTrue(TEXT("Head halo positioned behind head (+Y in mesh space)"), HeadHalo->GetRelativeLocation().Y > 10.f);
            }
        }

        // Advance to step 5: GuruVision and its halo manifest and levitate ~46 cm above floor!
        Save->Steps.Add(TEXT("yarlung"), 5);
        FTibetResidentTestAccessor::UpdateResidentVisibility(*Mode);
        const FVector FarPilgrim(-2000.f, 0.f, 90.f);
        FTibetResidentTestAccessor::UpdateResidents(*Mode, 0.05f, &FarPilgrim);

        TestFalse(TEXT("guruVision.yarlung visible at step 5"), Guru->IsHidden());
        if (Halo) TestFalse(TEXT("Halo visible at step 5"), Halo->IsHidden());
        const double FloorZ = Mode->GetObjectiveLocation().Z;
        const double HoverHeight = Guru->GetActorLocation().Z - FloorZ;
        TestTrue(TEXT("GuruVision levitates in mid-air ~46 cm above floor"),
            HoverHeight >= 38.0 && HoverHeight <= 54.0);

        // At step 8 (Talk to guruVision.yarlung), GetObjectiveLocation().Z stays at FloorZ for QA navigation.
        Save->Steps.Add(TEXT("yarlung"), 8);
        TestNearlyEqual(TEXT("GetObjectiveLocation().Z preserves floor Z while Guru levitates"),
            float(Mode->GetObjectiveLocation().Z), 0.f, 1.f);
        TestTrue(TEXT("Guru actor still levitates above floor at step 8"), Guru->GetActorLocation().Z >= 38.0);
    }

    FTibetResidentTestAccessor::CleanupMode(Mode);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetSkyGuruFullBodyRadianceTest, "Tibet.Resident.SkyGuruFullBodyRadiance",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetSkyGuruFullBodyRadianceTest::RunTest(const FString&)
{
    UWorld* World = FindAutomationWorld();
    TestNotNull(TEXT("Automation world exists"), World);
    if (!World) return false;

    auto* Save = NewObject<UTibetSave>();
    Save->Map = TEXT("stupa");
    Save->bEpilogue = true;
    Save->bComplete = true;

    auto* Mode = World->SpawnActor<ATibetGameMode>();
    TestNotNull(TEXT("Spawned GameMode"), Mode);
    if (!Mode) return false;

    FTibetResidentTestAccessor::Configure(*Mode, Save, TEXT("stupa"), TEXT("ending"));
    FTibetResidentTestAccessor::EnsureSkyGuru(*Mode);
    FTibetResidentTestAccessor::UpdateSkyGuruRadiance(*Mode, 1.25f);

    AActor* SkyGuru = FTibetResidentTestAccessor::GetSkyGuru(*Mode);
    ATibetGuruHalo* Halo = FTibetResidentTestAccessor::GetSkyGuruHalo(*Mode);
    TestNotNull(TEXT("SkyGuru spawned"), SkyGuru);
    TestNotNull(TEXT("SkyGuru ATibetGuruHalo spawned"), Halo);

    if (SkyGuru && Halo)
    {
        TestNull(TEXT("SkyGuru maintains 0 PointLights"), SkyGuru->FindComponentByClass<UPointLightComponent>());
        TestNull(TEXT("SkyGuru Halo maintains 0 PointLights"), Halo->FindComponentByClass<UPointLightComponent>());
        TestTrue(TEXT("SkyGuru Halo enables full-body celestial radiance"), Halo->HasFullBodyRadiance());
        TestEqual(TEXT("SkyGuru Halo attached to SkyGuru"), Halo->GetAttachParentActor(), SkyGuru);
        TestTrue(TEXT("SkyGuru Halo builds celestial thigle & light pillar section"), Halo->GetTotalSectionCount() >= 7);

        TInlineComponentArray<UStaticMeshComponent*> MeshComps;
        SkyGuru->GetComponents(MeshComps);
        const UStaticMeshComponent* AuraShell = nullptr;
        for (const UStaticMeshComponent* Comp : MeshComps)
            if (Comp->ComponentHasTag(TEXT("TibetSkyGuruAura"))) AuraShell = Comp;

        TestNotNull(TEXT("SkyGuru attaches 1.045x translucent golden radiance shell"), AuraShell);
        if (AuraShell)
        {
            TestNearlyEqual(TEXT("Radiance shell scale is 1.045x"), float(AuraShell->GetRelativeScale3D().X), 1.045f, 1e-3f);
            TestTrue(TEXT("Radiance shell has no collision"), AuraShell->GetCollisionEnabled() == ECollisionEnabled::NoCollision);
            for (int32 SlotIdx = 0; SlotIdx < AuraShell->GetNumMaterials(); ++SlotIdx)
                TestNotNull(FString::Printf(TEXT("Radiance shell slot %d uses dynamic emissive material"), SlotIdx),
                    Cast<UMaterialInstanceDynamic>(AuraShell->GetMaterial(SlotIdx)));
        }
    }

    FTibetResidentTestAccessor::CleanupMode(Mode);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTibetResidentDailyWalkingAndGreetingTest, "Tibet.Resident.DailyWalkingRoutinesAndGreeting",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTibetResidentDailyWalkingAndGreetingTest::RunTest(const FString&)
{
    UWorld* World = FindAutomationWorld();
    TestNotNull(TEXT("Automation world exists"), World);
    if (!World) return false;

    auto* Save = NewObject<UTibetSave>();
    Save->Steps.Add(TEXT("samye"), 0);
    auto* Mode = World->SpawnActor<ATibetGameMode>();
    TestNotNull(TEXT("Spawned GameMode"), Mode);
    if (!Mode) return false;

    FTibetResidentTestAccessor::Configure(*Mode, Save, TEXT("samye"));
    FTibetResidentTestAccessor::PopulateResidents(*Mode);

    AActor* Abbot = FTibetResidentTestAccessor::FindResident(*Mode, TEXT("shantarakshita"));
    AActor* King = FTibetResidentTestAccessor::FindResident(*Mode, TEXT("trisongDetsen"));
    TestNotNull(TEXT("Spawned shantarakshita"), Abbot);
    TestNotNull(TEXT("Spawned trisongDetsen"), King);

    if (Abbot && King)
    {
        auto* AbbotBody = Cast<UStaticMeshComponent>(Abbot->GetRootComponent());
        auto* KingBody = Cast<UStaticMeshComponent>(King->GetRootComponent());
        TestNotNull(TEXT("Abbot RootComponent stays UStaticMeshComponent"), AbbotBody);
        TestNotNull(TEXT("King RootComponent stays UStaticMeshComponent"), KingBody);

        const FVector AbbotStart = Abbot->GetActorLocation();
        const FVector KingStart = King->GetActorLocation();
        const FVector FarPilgrim(-2000.f, 0.f, 90.f);

        double MaxAbbotTravel = 0.0, MaxKingTravel = 0.0, MaxStepLift = 0.0;
        for (int32 Step = 0; Step < 90; ++Step)
        {
            FTibetResidentTestAccessor::UpdateResidents(*Mode, 1.f / 30.f, &FarPilgrim);
            MaxAbbotTravel = FMath::Max(MaxAbbotTravel, FVector::Dist2D(Abbot->GetActorLocation(), AbbotStart));
            MaxKingTravel = FMath::Max(MaxKingTravel, FVector::Dist2D(King->GetActorLocation(), KingStart));
            MaxStepLift = FMath::Max(MaxStepLift, Abbot->GetActorLocation().Z - AbbotStart.Z);
        }

        TestTrue(TEXT("Active resident walks naturally near Home (>25 cm and <=75 cm QA safety bound)"),
            MaxAbbotTravel > 25.0 && MaxAbbotTravel <= 75.0);
        TestTrue(TEXT("Non-active resident walks natural daily loop (>30 cm and <=105 cm)"),
            MaxKingTravel > 30.0 && MaxKingTravel <= 105.0);
        TestTrue(TEXT("Walking stride produces visible vertical footstep bounce"), MaxStepLift > 1.5);

        // Simulate DialogueTest / Pilgrim approaching to ObjectiveLocation - (165, 0, 0).
        const FVector DialogueTestPos = Mode->GetObjectiveLocation() - FVector(165.f, 0.f, 0.f);
        for (int32 Step = 0; Step < 36; ++Step)
            FTibetResidentTestAccessor::UpdateResidents(*Mode, 1.f / 30.f, &DialogueTestPos);

        const double FinalDist = FVector::Dist2D(DialogueTestPos, Mode->GetObjectiveLocation());
        TestTrue(TEXT("Resident stays steadily inside 225 cm interaction range when Pilgrim stands 165 cm away"),
            FinalDist <= 225.0);
        // Pilgrim is at -X relative to Abbot, so HeadingYaw -> +-180 deg and ActorYaw = HeadingYaw + 90 -> -90 deg.
        const float YawErrorToPilgrim = FMath::Abs(FRotator::NormalizeAxis(Abbot->GetActorRotation().Yaw - (-90.f)));
        TestTrue(TEXT("Resident turns warmly to face nearby Pilgrim"), YawErrorToPilgrim < 6.f);
    }

    FTibetResidentTestAccessor::CleanupMode(Mode);
    return true;
}
#endif
