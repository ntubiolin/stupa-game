#include "TojiGameMode.h"

#include "Components/DirectionalLightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/SkyLight.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerStart.h"
#include "GameFramework/PlayerController.h"
#include "HAL/FileManager.h"
#include "HAL/PlatformProcess.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "TojiCharacter.h"
#include "TojiFigures.h"
#include "TojiHUD.h"

namespace
{
struct FObjective
{
    FVector At;
    float Range;
    const TCHAR* English;
    const TCHAR* Chinese;
};

// Web world (x,z) maps to UE (-100z, 100(x - 7500), 0).
const FObjective Objectives[] = {
    {FVector(-4200, -900, 0), 340, TEXT("Speak with Kūkai inside the south gate"), TEXT("在南大門內請教空海")},
    {FVector(-2000, 0, 0), 255, TEXT("Offer a lamp to Yakushi at the Kondō"), TEXT("在金堂前向藥師如來獻燈")},
    {FVector(2400, 0, 0), 255, TEXT("Contemplate the mandala on the north walk"), TEXT("到北側參道觀想曼荼羅")},
    {FVector(-3200, -2200, 0), 255, TEXT("Purify the Earth ward in the southwest courtyard"), TEXT("淨化西南庭院的地之結界")},
    {FVector(-2600, 2000, 0), 255, TEXT("Purify the Fire ward in the southeast courtyard"), TEXT("淨化東南庭院的火之結界")},
    {FVector(1800, -2100, 0), 255, TEXT("Purify the Wind ward in the northwest courtyard"), TEXT("淨化西北庭院的風之結界")}
};
static_assert(UE_ARRAY_COUNT(Objectives) == TojiSave::ChapterSteps);

constexpr int32 FirstWard = 3;
constexpr float SkillRange = 630;
const FLinearColor Gold(0.83f, 0.34f, 0.06f);
const FLinearColor Patina(0.20f, 0.28f, 0.25f);
const FLinearColor Stone(0.33f, 0.31f, 0.26f);
}

ATojiGameMode::ATojiGameMode()
{
    PrimaryActorTick.bCanEverTick = true;
    DefaultPawnClass = ATojiCharacter::StaticClass();
    HUDClass = ATojiHUD::StaticClass();
}

AActor* ATojiGameMode::ChoosePlayerStart_Implementation(AController* Player)
{
    if (AActor* Start = Super::ChoosePlayerStart_Implementation(Player))
    {
        return Start;
    }
    return GetWorld()->SpawnActor<APlayerStart>(FVector(-4400, 0, 102), FRotator::ZeroRotator);
}

void ATojiGameMode::StartPlay()
{
    TojiSave::Load(Progress);
    FString Path;
    if (FParse::Value(FCommandLine::Get(), TEXT("-TojiImport="), Path))
    {
        ImportFile(Path);
    }

    if (AActor* Kukai = SpawnFigureRoot(Objectives[0].At, FRotator(0, 65, 0)))
    {
        TojiFigures::Person(*Kukai, *Kukai->GetRootComponent(), false);
    }

    if (AActor* Lamp = SpawnFigureRoot(Objectives[1].At + FVector(0, 65, 0)))
    {
        USceneComponent& Root = *Lamp->GetRootComponent();
        TojiFigures::Part(*Lamp, Root, TEXT("Cube"), FVector(0, 0, 17), FVector(76, 76, 34), Stone);
        TojiFigures::Part(*Lamp, Root, TEXT("Cylinder"), FVector(0, 0, 53), FVector(29, 29, 50), Patina);
        TojiFigures::Part(*Lamp, Root, TEXT("Cylinder"), FVector(0, 0, 78), FVector(54, 54, 9), Patina);
        TojiFigures::Part(*Lamp, Root, TEXT("Sphere"), FVector(0, 0, 91), FVector(53, 53, 21), Gold);
        Flame = TojiFigures::Part(*Lamp, Root, TEXT("Sphere"), FVector(0, 0, 113), FVector(18, 18, 36),
            FLinearColor(1.0f, 0.42f, 0.035f));
    }

    for (int32 Index = 2; Index < TojiSave::ChapterSteps; ++Index)
    {
        if (AActor* Shrine = SpawnFigureRoot(Objectives[Index].At))
        {
            USceneComponent& Root = *Shrine->GetRootComponent();
            TojiFigures::Part(*Shrine, Root, TEXT("Cylinder"), FVector(0, 0, 10), FVector(82, 82, 20), Stone);
            TojiFigures::Part(*Shrine, Root, TEXT("Cylinder"), FVector(0, 0, 26), FVector(62, 62, 14), Patina);
            for (int32 Petal = 0; Petal < 8; ++Petal)
            {
                const FRotator Angle(0, Petal * 45.0f, 0);
                TojiFigures::Part(*Shrine, Root, TEXT("Sphere"), FVector(0, 0, 34) + Angle.Vector() * 24,
                    FVector(26, 12, 6), Gold, Angle);
            }
        }
    }

    Marker = SpawnFigureRoot(FVector::ZeroVector);
    if (Marker)
    {
        TojiFigures::Part(*Marker, *Marker->GetRootComponent(), TEXT("Cube"), FVector(0, 0, 218),
            FVector(26), Gold, FRotator(45, 45, 45))->SetCastShadow(false);
    }
    RefreshQuest();
    FindLights();
    FString Time;
    if (FParse::Value(FCommandLine::Get(), TEXT("-TojiTime="), Time))
    {
        SetTimeOfDay(Time.Equals(TEXT("night"), ESearchCase::IgnoreCase) ? 2
            : Time.Equals(TEXT("dusk"), ESearchCase::IgnoreCase) ? 1 : 0);
    }
    Super::StartPlay();
}

AActor* ATojiGameMode::SpawnFigureRoot(const FVector& At, const FRotator& Rotation)
{
    AActor* Figure = GetWorld()->SpawnActor<AActor>();
    if (Figure)
    {
        USceneComponent* Root = NewObject<USceneComponent>(Figure);
        Figure->AddInstanceComponent(Root);
        Figure->SetRootComponent(Root);
        Root->RegisterComponent();
        Figure->SetActorLocationAndRotation(At, Rotation);
    }
    return Figure;
}

void ATojiGameMode::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    NoticeRemaining = FMath::Max(0.0f, NoticeRemaining - DeltaSeconds);
    ConfirmImportRemaining = FMath::Max(0.0f, ConfirmImportRemaining - DeltaSeconds);
    if (Marker)
    {
        Marker->AddActorLocalRotation(FRotator(0, 35 * DeltaSeconds, 0));
    }
    if (Flame && Progress.Completed >= 2)
    {
        const double Flicker = GetWorld()->GetTimeSeconds();
        Flame->SetRelativeScale3D(FVector(0.18, 0.18, 0.36 + 0.05 * FMath::Sin(Flicker * 13)));
    }
    if (Pulse)
    {
        PulseRemaining -= DeltaSeconds;
        if (PulseRemaining <= 0)
        {
            Pulse->GetOwner()->Destroy();
            Pulse = nullptr;
        }
        else
        {
            const double Spread = 3.0 * (1.0 - PulseRemaining / 0.38);
            Pulse->SetRelativeScale3D(FVector(Spread, Spread, 0.012));
        }
    }
    if (const ATojiCharacter* Player = Pilgrim(); bInDialogue && Player && !IsNearObjective(*Player))
    {
        bInDialogue = false;
    }
    if (Shade)
    {
        ShadeAge += DeltaSeconds;
        const FVector Center = Objectives[Progress.Completed].At;
        const double Angle = ShadeAge * 1.25 + UE_PI;
        Shade->SetActorLocation(Center + FVector(190 * FMath::Cos(Angle), 130 * FMath::Sin(Angle),
            110 + 37 * FMath::Sin(ShadeAge * 3)));
        AttackRemaining -= DeltaSeconds;
        if (AttackRemaining <= 0)
        {
            AttackRemaining = 3.0f;
            if (const ATojiCharacter* Player = Pilgrim(); Player
                && FVector::Dist2D(Player->GetActorLocation(), Shade->GetActorLocation()) <= 260)
            {
                ShadeHealth = 2;
                SetNotice(TEXT("The shade recovered. Keep your distance and cast twice."),
                    TEXT("幻影已恢復。請保持距離，施法兩次。"));
            }
        }
    }
}

const ATojiCharacter* ATojiGameMode::Pilgrim() const
{
    if (const APlayerController* Player = GetWorld()->GetFirstPlayerController())
    {
        return ::Cast<ATojiCharacter>(Player->GetPawn());
    }
    return nullptr;
}

bool ATojiGameMode::IsNearObjective(const ATojiCharacter& Player) const
{
    return Progress.Completed < TojiSave::ChapterSteps
        && FVector::Dist2D(Player.GetActorLocation(), Objectives[Progress.Completed].At)
            <= Objectives[Progress.Completed].Range;
}

void ATojiGameMode::Interact(ATojiCharacter& Player)
{
    if (!IsNearObjective(Player))
    {
        bInDialogue = false;
        return;
    }
    if (Progress.Completed == 0 && !bInDialogue)
    {
        bInDialogue = true;
        return;
    }
    if (Progress.Completed < FirstWard)
    {
        Advance();
        return;
    }
    if (Shade)
    {
        return;
    }

    const FVector At = Objectives[Progress.Completed].At + FVector(-190, 0, 110);
    Shade = SpawnFigureRoot(At);
    if (!Shade)
    {
        return;
    }
    ShadeAge = 0;
    AttackRemaining = 3.0f;
    ShadeHealth = 2;
    const FLinearColor Ink(0.12f, 0.045f, 0.17f);
    USceneComponent& Root = *Shade->GetRootComponent();
    TojiFigures::Part(*Shade, Root, TEXT("Sphere"), FVector::ZeroVector, FVector(70, 70, 80), Ink);
    TojiFigures::Part(*Shade, Root, TEXT("Cube"), FVector(0, 0, 5), FVector(39), Gold, FRotator(45, 45, 45));
    for (int32 Side : {-1, 1})
    {
        TojiFigures::Part(*Shade, Root, TEXT("Cone"), FVector(0, Side * 45, 0), FVector(33, 38, 114), Ink,
            FRotator(0, 0, Side * 54));
    }
}

void ATojiGameMode::Cast(ATojiCharacter& Player)
{
    if (!Shade)
    {
        SetNotice(TEXT("Activate a ward to use the purification skill."), TEXT("啟動結界後即可施展淨化。"));
        return;
    }
    if (Pulse)
    {
        return;
    }
    if (AActor* Effect = SpawnFigureRoot(Player.GetActorLocation() - FVector(0, 0, 85)))
    {
        Pulse = TojiFigures::Part(*Effect, *Effect->GetRootComponent(), TEXT("Cylinder"), FVector::ZeroVector,
            FVector(10, 10, 1.2), Gold);
        Pulse->SetCastShadow(false);
        PulseRemaining = 0.38f;
    }
    if (FVector::Dist2D(Player.GetActorLocation(), Shade->GetActorLocation()) > SkillRange)
    {
        SetNotice(TEXT("The ward shade is too far away. Move closer."), TEXT("結界幻影太遠了，請靠近。"));
        return;
    }
    if (ShadeHealth <= 1)
    {
        Advance();
        return;
    }
    --ShadeHealth;
    SetNotice(TEXT("The shade weakens. Cast again."), TEXT("幻影已衰弱。請再次施法。"));
}

void ATojiGameMode::Advance()
{
    FTojiProgress Next = Progress;
    ++Next.Completed;
    if (!TojiSave::Write(Next))
    {
        SetNotice(TEXT("Progress could not be saved. Try again."), TEXT("無法儲存進度，請再試一次。"));
        return;
    }
    Progress = MoveTemp(Next);
    StopEncounter();
    RefreshQuest();
    SetNotice(TEXT("Pilgrimage progress saved."), TEXT("朝聖進度已儲存。"));
}

void ATojiGameMode::RefreshQuest()
{
    if (Marker)
    {
        Marker->SetActorHiddenInGame(Progress.Completed >= TojiSave::ChapterSteps);
        if (Progress.Completed < TojiSave::ChapterSteps)
        {
            Marker->SetActorLocation(Objectives[Progress.Completed].At);
        }
    }
    if (Flame)
    {
        Flame->SetVisibility(Progress.Completed >= 2);
    }
}

void ATojiGameMode::StopEncounter()
{
    bInDialogue = false;
    if (Shade)
    {
        Shade->Destroy();
        Shade = nullptr;
    }
}

void ATojiGameMode::ChangeLanguage()
{
    FTojiProgress Next = Progress;
    Next.bEnglish = !Next.bEnglish;
    if (TojiSave::Write(Next))
    {
        Progress = MoveTemp(Next);
    }
    else
    {
        SetNotice(TEXT("Language could not be saved."), TEXT("無法儲存語言設定。"));
    }
}

void ATojiGameMode::ShowImportFolder()
{
    const FString Folder = TojiSave::Directory();
    if (IFileManager::Get().MakeDirectory(*Folder, true))
    {
        FPlatformProcess::ExploreFolder(*Folder);
        SetNotice(TEXT("Put stupa.save.v2.json in this folder, then press F9 to replace local progress."),
            TEXT("將 stupa.save.v2.json 放入資料夾，再按 F9 以取代本機進度。"), 9);
    }
    else
    {
        SetNotice(TEXT("The save folder is unavailable."), TEXT("無法開啟存檔資料夾。"));
    }
}

void ATojiGameMode::ImportFromFolder()
{
    if (ConfirmImportRemaining <= 0)
    {
        ConfirmImportRemaining = 8;
        SetNotice(TEXT("Press F9 again to replace local progress with the web backup."),
            TEXT("再按一次 F9，將本機進度替換為網頁版備份。"), ConfirmImportRemaining);
        return;
    }
    ConfirmImportRemaining = 0;
    ImportFile(TojiSave::Directory() / TEXT("stupa.save.v2.json"));
}

void ATojiGameMode::ImportFile(const FString& Path)
{
    switch (TojiSave::Import(Path, Progress))
    {
        case ETojiImportResult::Success:
            StopEncounter();
            RefreshQuest();
            SetNotice(TEXT("Web save imported. The full original is in WebBackups."),
                TEXT("已匯入網頁版存檔。完整原檔保留於 WebBackups。"), 8);
            break;
        case ETojiImportResult::StorageError:
            SetNotice(TEXT("Import could not be saved. Local progress was kept."),
                TEXT("無法儲存匯入結果。本機進度已保留。"), 8);
            break;
        default:
            SetNotice(TEXT("Use a valid stupa.save.v2.json backup. Local progress was kept."),
                TEXT("請使用有效的 stupa.save.v2.json 備份。本機進度已保留。"), 8);
            break;
    }
}

void ATojiGameMode::FindLights()
{
    for (TActorIterator<ADirectionalLight> It(GetWorld()); It; ++It)
    {
        if (It->ActorHasTag(TEXT("Toji.Sun")))
        {
            Sun = *It;
            const UDirectionalLightComponent* Light = Sun->FindComponentByClass<UDirectionalLightComponent>();
            DaySunRotation = Sun->GetActorRotation();
            DayIntensity = Light->Intensity;
            DaySunColor = Light->LightColor;
            DayTemperature = Light->Temperature;
            bDayUseTemperature = Light->bUseTemperature;
            break;
        }
    }
    for (TActorIterator<ASkyLight> It(GetWorld()); It; ++It)
    {
        if (It->ActorHasTag(TEXT("Toji.SkyLight")))
        {
            SkyLight = *It;
            DaySkyIntensity = SkyLight->GetLightComponent()->Intensity;
            break;
        }
    }
}

void ATojiGameMode::SetTimeOfDay(int32 Time)
{
    if (Time < 0 || Time > 2 || Time == TimeOfDay)
    {
        return;
    }
    TimeOfDay = Time;
    if (Sun)
    {
        UDirectionalLightComponent* Light = Sun->FindComponentByClass<UDirectionalLightComponent>();
        if (Time == 0)
        {
            Sun->SetActorRotation(DaySunRotation);
            Light->SetIntensity(DayIntensity);
            Light->SetLightColor(FLinearColor::FromSRGBColor(DaySunColor));
            Light->SetTemperature(DayTemperature);
            Light->SetUseTemperature(bDayUseTemperature);
        }
        else
        {
            // Match the spring light rays sampled at Web t=0.72 (sun) and t=0.86 (moon).
            Sun->SetActorRotation(Time == 1 ? FRotator(-10.30, 74.97, 0) : FRotator(-35.06, -88.76, 0));
            Light->SetIntensity(Time == 1 ? 8000.0f : 1.8f);
            Light->SetLightColor(FLinearColor::White);
            Light->SetTemperature(Time == 1 ? 3800.0f : 8500.0f);
            Light->SetUseTemperature(true);
        }
    }
    if (SkyLight)
    {
        USkyLightComponent* Light = SkyLight->GetLightComponent();
        Light->SetIntensity(DaySkyIntensity * (Time == 0 ? 1.0f : Time == 1 ? 0.73f : 0.32f));
        if (!Light->bRealTimeCapture)
        {
            Light->RecaptureSky();
        }
    }
}

FText ATojiGameMode::Text(const TCHAR* English, const TCHAR* Chinese) const
{
    return FText::FromString(IsEnglish() ? English : Chinese);
}

FText ATojiGameMode::ObjectiveText() const
{
    if (Progress.Completed >= TojiSave::ChapterSteps)
    {
        return Text(TEXT("Tō-ji pilgrimage complete"), TEXT("東寺朝聖圓滿"));
    }
    const FObjective& Objective = Objectives[Progress.Completed];
    if (const ATojiCharacter* Player = Pilgrim())
    {
        const FVector Destination = Objective.At - Player->GetActorLocation();
        const int32 Meters = FMath::RoundToInt(Destination.Size2D() / 100.0);
        const double CameraYaw = Player->GetControlRotation().Yaw;
        const double Heading = FMath::UnwindDegrees(Destination.Rotation().Yaw - CameraYaw);
        const int32 Sector = FMath::RoundToInt(Heading / 45.0) & 7;
        const TCHAR* En[] = {TEXT("ahead"), TEXT("ahead-right"), TEXT("right"), TEXT("back-right"),
            TEXT("behind"), TEXT("back-left"), TEXT("left"), TEXT("ahead-left")};
        const TCHAR* Zh[] = {TEXT("前方"), TEXT("右前方"), TEXT("右側"), TEXT("右後方"),
            TEXT("後方"), TEXT("左後方"), TEXT("左側"), TEXT("左前方")};
        const FString Distance = FString::Printf(TEXT("%d %s %s"), Meters,
            IsEnglish() ? TEXT("m") : TEXT("公尺"), IsEnglish() ? En[Sector] : Zh[Sector]);
        return FText::Format(NSLOCTEXT("Toji", "QuestWithDistance", "{0}  ·  {1}"),
            Text(Objective.English, Objective.Chinese), FText::FromString(Distance));
    }
    return Text(Objective.English, Objective.Chinese);
}

FText ATojiGameMode::PromptText() const
{
    if (Shade)
    {
        return FText::Format(Text(TEXT("Q   Purify the ward shade   ·   {0} casts to go"),
            TEXT("Q   淨化結界幻影   ·   尚需施法 {0} 次")), FText::AsNumber(ShadeHealth));
    }
    if (const ATojiCharacter* Player = Pilgrim(); Player && IsNearObjective(*Player))
    {
        if (bInDialogue)
        {
            return Text(TEXT("E   Continue to the Kondō"), TEXT("E   前往金堂"));
        }
        switch (Progress.Completed)
        {
            case 0: return Text(TEXT("E   Speak with Kūkai"), TEXT("E   與空海交談"));
            case 1: return Text(TEXT("E   Light the offering lamp"), TEXT("E   點亮供燈"));
            case 2: return Text(TEXT("E   Honor the mandala"), TEXT("E   禮敬曼荼羅"));
            default: return Text(TEXT("E   Activate the ward"), TEXT("E   啟動結界"));
        }
    }
    return FText::GetEmpty();
}

FText ATojiGameMode::NoticeText() const
{
    if (bInDialogue)
    {
        return Text(TEXT("Kūkai · First offer a lamp to Yakushi at the Kondō. Then contemplate the mandala and "
            "purify the three wards that protect the pagoda’s heart pillar."),
            TEXT("空海・請先到金堂向藥師如來獻燈，再觀想曼荼羅，淨化守護五重塔心柱的三道結界。"));
    }
    return NoticeRemaining > 0 ? (IsEnglish() ? NoticeEnglish : NoticeChinese) : FText::GetEmpty();
}

FText ATojiGameMode::TimeText() const
{
    switch (TimeOfDay)
    {
        case 1: return Text(TEXT("Dusk"), TEXT("黃昏"));
        case 2: return Text(TEXT("Night"), TEXT("夜晚"));
        default: return Text(TEXT("Daylight"), TEXT("白晝"));
    }
}

void ATojiGameMode::SetNotice(const TCHAR* English, const TCHAR* Chinese, float Seconds)
{
    NoticeEnglish = FText::FromString(English);
    NoticeChinese = FText::FromString(Chinese);
    NoticeRemaining = Seconds;
}
