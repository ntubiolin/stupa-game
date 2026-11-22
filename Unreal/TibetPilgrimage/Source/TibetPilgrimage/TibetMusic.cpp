#include "TibetGameMode.h"
#include "TibetSkyClock.h"
#include "Components/AudioComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Sound/SoundWave.h"

namespace
{
FName RegionScore(const FString& Map, int32 Step, bool bBoss, bool bNight, bool bComplete)
{
    if (bComplete) return TEXT("credits");
    if (Map == TEXT("stupa")) return bNight ? TEXT("stupa_night") : TEXT("stupa");
    if (Map == TEXT("pharping"))
    {
        if (bBoss) return TEXT("boss_droughtLord");
        return Step >= 13 ? TEXT("pharping_rain") : TEXT("pharping_drought");
    }
    if (Map == TEXT("mangyul"))
    {
        if (bBoss) return TEXT("boss_tenmaStorm");
        return Step >= 4 ? TEXT("mangyul_calm") : TEXT("mangyul_storm");
    }
    if (Map == TEXT("yarlung"))
    {
        if (bBoss) return TEXT("boss_yarlhaShampo");
        return Step >= 5 ? TEXT("yarlung_calm") : TEXT("yarlung_unrest");
    }
    if (Map == TEXT("samye"))
    {
        if (bBoss) return TEXT("boss_pehar");
        if (Step >= 6) return TEXT("samye_complete");
        return Step == 2 ? TEXT("samye_night") : TEXT("samye_day");
    }
    if (Map.StartsWith(TEXT("terma"))) return bBoss ? TEXT("boss_termaGuardian") : TEXT("terma");
    if (Map == TEXT("chimphu")) return TEXT("chimphu");
    return bBoss ? TEXT("boss_migoiKing") : TEXT("wild");
}
}

void ATibetGameMode::RefreshScore()
{
    const bool bNight = ATibetSkyClock::Daylight(SolarPhase()) < .45f;
    const FName Cue = RegionScore(Map, GetStep(), GetObjectiveKind() == TEXT("Boss"), bNight, IsCampaignComplete());
    if (Cue == ScoreName) return;
    const FString Name = Cue.ToString();
    const FString Path = FString::Printf(TEXT("/Game/Music/%s.%s"), *Name, *Name);
    ScoreName = Cue;
    USoundWave* Wave = LoadObject<USoundWave>(nullptr, *Path);
    if (!Wave)
    {
        UE_LOG(LogTemp, Error, TEXT("Missing pilgrimage score %s"), *Path);
        return;
    }
    const bool bBossTransition = Name.StartsWith(TEXT("boss_")) ||
        (ScorePlayer && ScorePlayer->Sound && ScorePlayer->Sound->GetName().StartsWith(TEXT("boss_")));
    const float Fade = bBossTransition ? 1.2f : 3.2f;
    if (ScorePlayer) ScorePlayer->FadeOut(Fade, 0.f);
    ScorePlayer = UGameplayStatics::CreateSound2D(this, Wave);
    if (ScorePlayer)
    {
        ScorePlayer->FadeIn(Fade);
        UE_LOG(LogTemp, Display, TEXT("TIBET_SCORE cue=%s loop=%d playing=%d seconds=%.1f"),
            *Name, Wave->bLooping, ScorePlayer->IsPlaying(), Wave->Duration);
    }
}
