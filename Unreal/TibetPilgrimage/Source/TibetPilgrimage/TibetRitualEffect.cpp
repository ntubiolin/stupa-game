#include "TibetRitualEffect.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "GameFramework/Pawn.h"
#include "Materials/Material.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "ProceduralMeshComponent.h"

namespace
{
const FVector Up = FVector::UpVector;
FVector Radial(double Angle) { return {FMath::Cos(Angle), FMath::Sin(Angle), 0}; }

// Each colour is one mesh section. Thin leaves are wound on both sides so a
// pilgrim looking back at a spell sees the same silhouette.
struct FSurface
{
    TArray<FVector> Points, Normals;
    TArray<int32> Indices;
    void Triangle(FVector A, FVector B, FVector C)
    {
        FVector N = FVector::CrossProduct(B - A, C - A).GetSafeNormal();
        if (N.IsNearlyZero()) return;
        int32 Base = Points.Num();
        Points.Append({A, B, C, A, C, B});
        Normals.Append({N, N, N, -N, -N, -N});
        Indices.Append({Base + 2, Base + 1, Base, Base + 5, Base + 4, Base + 3});
    }
    void Quad(FVector A, FVector B, FVector C, FVector D)
    {
        Triangle(A, B, C);
        Triangle(A, C, D);
    }
    void Stroke(FVector A, FVector B, double Radius)
    {
        const FVector Axis = (B - A).GetSafeNormal();
        FVector U, V;
        Axis.FindBestAxisVectors(U, V);
        FVector Last = U * Radius;
        for (int32 I = 1; I <= 4; ++I)
        {
            const double T = I * UE_HALF_PI;
            const FVector Next = (U * FMath::Cos(T) + V * FMath::Sin(T)) * Radius;
            Quad(A + Last, B + Last, B + Next, A + Next);
            Last = Next;
        }
    }
    void Hoop(FVector Center, FVector X, FVector Y, double Radius, double Thickness,
        double Begin = 0, double End = UE_TWO_PI)
    {
        const int32 Steps = FMath::Max(5, FMath::CeilToInt(36 * (End - Begin) / UE_TWO_PI));
        for (int32 I = 0; I < Steps; ++I)
        {
            const double A = FMath::Lerp(Begin, End, double(I) / Steps);
            const double B = FMath::Lerp(Begin, End, double(I + 1) / Steps);
            const FVector D = X * FMath::Cos(A) + Y * FMath::Sin(A);
            const FVector E = X * FMath::Cos(B) + Y * FMath::Sin(B);
            Quad(Center + D * (Radius - Thickness), Center + D * (Radius + Thickness),
                 Center + E * (Radius + Thickness), Center + E * (Radius - Thickness));
        }
    }
    void Profile(const TArray<FVector2D>& Rings, int32 Sides)
    {
        for (int32 J = 1; J < Rings.Num(); ++J)
        {
            const auto P = Rings[J - 1], Q = Rings[J];
            for (int32 I = 0; I < Sides; ++I)
            {
                const FVector A = Radial(I * UE_TWO_PI / Sides), B = Radial((I + 1) * UE_TWO_PI / Sides);
                Quad(A * P.X + Up * P.Y, B * P.X + Up * P.Y, B * Q.X + Up * Q.Y, A * Q.X + Up * Q.Y);
            }
        }
    }
    // A folded leaf with a raised midrib, narrowing to a single point at each end.
    void Leaf(FVector A, FVector B, FVector HalfWidth, FVector Bend)
    {
        FVector LastLeft = A, LastRight = A, LastSpine = A;
        for (int32 I = 1; I <= 9; ++I)
        {
            const double T = I / 9., Arch = FMath::Sin(UE_PI * T);
            const FVector Mid = FMath::Lerp(A, B, T) + Bend * Arch;
            const FVector Left = Mid - HalfWidth * Arch, Right = Mid + HalfWidth * Arch;
            const FVector Spine = Mid + Bend * (Arch * .23);
            Quad(LastLeft, Left, Spine, LastSpine);
            Quad(LastSpine, Spine, Right, LastRight);
            LastLeft = Left; LastRight = Right; LastSpine = Spine;
        }
    }
    void Install(UProceduralMeshComponent* Mesh, int32 Section, UMaterialInterface* Base, FLinearColor Colour)
    {
        if (Points.IsEmpty()) return;
        Mesh->CreateMeshSection(Section, Points, Indices, Normals, {}, {}, {}, false);
        if (Base)
        {
            auto* Ink = Mesh->CreateDynamicMaterialInstance(Section, Base);
            if (Ink) Ink->SetVectorParameterValue(TEXT("Color"), Colour);
        }
        else if (UMaterialInterface* DefaultMat = UMaterial::GetDefaultMaterial(MD_Surface))
        {
            Mesh->SetMaterial(Section, DefaultMat);
        }
    }
};

void Hum(FSurface& Body, FSurface& Rim, FSurface& Crown)
{
    // Five-pronged Tibetan Vajra Bolt ("吽字光彈") with golden central prong & twin turquoise mantra helices
    Body.Leaf({-92,0,0}, {38,0,0}, {0,21,0}, {0,0,18});
    Body.Leaf({-82,0,0}, {38,0,0}, {0,0,20}, {0,-18,0});
    for (int32 K = 0; K < 4; ++K)
    {
        const double A = K * UE_HALF_PI + UE_PI * .25;
        const FVector Out(0, FMath::Cos(A), FMath::Sin(A));
        Crown.Stroke({-16, 0, 0}, FVector(12, 0, 0) + Out * 22, 2.2);
        Crown.Stroke(FVector(12, 0, 0) + Out * 22, {42, 0, 0}, 2.0);
    }
    Crown.Hoop({-18, 0, 0}, {0, 1, 0}, {0, 0, 1}, 18, 2.2);
    for (int32 J = 0; J < 2; ++J)
    {
        FVector Last(-112,0,0);
        for (int32 I = 1; I <= 26; ++I)
        {
            const double T = I / 26., A = 9.0 * T + J * UE_PI, R = 19 * FMath::Sin(T * UE_PI);
            const FVector Next(-112 + 138 * T, R * FMath::Cos(A), R * FMath::Sin(A));
            Rim.Stroke(Last, Next, 1.3 + 1.4 * T);
            Last = Next;
        }
    }
}

void Chant(FSurface& Body, FSurface& Rim, FSurface& Crown)
{
    // Oṃ Maṇi Padme Hūṃ Six-Syllable Lotus Dharma Wheel ("六字大明咒")
    Body.Hoop(Up * 6, FVector::ForwardVector, FVector::RightVector, 128, 3.2);
    Rim.Hoop(Up * 8, FVector::ForwardVector, FVector::RightVector, 120, 1.6);
    Rim.Hoop(Up * 10, FVector::ForwardVector, FVector::RightVector, 62, 2.0);
    for (int32 J = 0; J < 6; ++J)
    {
        const double A = J * UE_TWO_PI / 6;
        const FVector R = Radial(A), Side = Up ^ R;
        Body.Leaf(R * 36 + Up * 4, R * 116 + Up * 14, Side * 22, Up * 12);
        Rim.Leaf(R * 112 + Up * 8, R * 148 + Up * 22, Side * 8, Up * 9);
        Rim.Stroke(R * 24 + Up * 8, R * 120 + Up * 8, 1.8);
        const FVector Mid = Radial(A + UE_PI / 6) * 92 + Up * 24;
        Crown.Hoop(Mid, FVector::ForwardVector, FVector::RightVector, 11, 2.6);
        Crown.Leaf(Mid - Up * 10, Mid + Up * 18, Side * 6, R * 5);
    }
}

void Phurba(FSurface& Body, FSurface& Rim, FSurface& Crown)
{
    // Wrathful Three-Bladed Vajrakilaya Ritual Dagger ("普巴金剛橛") + Triangular Dharmadhatu Seal
    Body.Profile({{0,-94},{5,-72},{19,14},{10,24},{0,26}}, 3);
    Rim.Profile({{8,16},{21,22},{20,28},{9,32},{12,48},{6,56}}, 12);
    for (int32 I = 0; I < 3; ++I)
    {
        const FVector R = Radial(I * UE_TWO_PI / 3), NextR = Radial((I + 1) * UE_TWO_PI / 3);
        Rim.Leaf(Up * 50, Up * 88, (Up ^ R) * 6, R * 18);
        Crown.Stroke(R * 58 - Up * 82, NextR * 58 - Up * 82, 3.0);
        Crown.Leaf(R * 42 - Up * 82, R * 84 - Up * 66, (Up ^ R) * 9, Up * 14);
    }
    Crown.Hoop(-Up * 82, FVector::ForwardVector, FVector::RightVector, 64, 2.4);
    Body.Profile({{5,50},{8,66},{0,94}}, 8);
}

void Bell(FSurface& Body, FSurface& Rim, FSurface& Crown)
{
    // Tibetan Prajñā Ghanta Ritual Bell ("金剛鈴退散") + Three Sonic Dharma Rings
    Body.Profile({{0,24},{8,20},{11,10},{14,-8},{18,-20},{28,-33},{30,-37},{23,-37}}, 24);
    Rim.Profile({{6,20},{7,34},{13,40},{6,46},{0,56}}, 12);
    for (int32 I = 0; I < 3; ++I)
    {
        const double R = 56 + 46 * I;
        const FVector WaveCenter(R * .52, 0, 0);
        Rim.Hoop(WaveCenter, FVector::RightVector, Up, R * .44, 2.6, -.46 * UE_PI, .46 * UE_PI);
        Rim.Hoop(WaveCenter, FVector::RightVector, Up, R * .44, 2.6, .54 * UE_PI, 1.46 * UE_PI);
        Crown.Hoop(WaveCenter, FVector::RightVector, Up, R * .36, 1.5);
    }
}

void Lotus(FSurface& Body, FSurface& Rim, FSurface& Crown)
{
    // Translucent 12-Petal Sacred Padma Protection Shield ("蓮華護盾")
    for (int32 I = 0; I < 12; ++I)
    {
        FVector R = Radial(I * UE_TWO_PI / 12), Side = Up ^ R;
        Body.Leaf(R * 28, R * 86 + Up * 78, Side * 21, R * 16);
        R = Radial((I + .5) * UE_TWO_PI / 12);
        Rim.Leaf(R * 32, R * 96 + Up * 44, (Up ^ R) * 15, R * 12);
    }
    Rim.Hoop(Up * 6, FVector::ForwardVector, FVector::RightVector, 88, 2.2);
    Crown.Hoop(Up * 46, FVector::ForwardVector, FVector::RightVector, 92, 1.8);
    for (int32 K = 0; K < 8; ++K)
    {
        const FVector R = Radial(K * UE_TWO_PI / 8);
        Crown.Leaf(R * 86 + Up * 42, R * 98 + Up * 58, (Up ^ R) * 5, Up * 6);
    }
}

void Invocation(FSurface& Body, FSurface& Rim, FSurface& Crown)
{
    // Twelve Tenma Snow-Goddess Protector Summon ("護法召喚")
    const FVector BackCenter(-18, 0, 128);
    Rim.Hoop(BackCenter, FVector::RightVector, Up, 76, 3.2);
    Crown.Hoop(BackCenter, FVector::RightVector, Up, 54, 2.0);
    Body.Hoop(Up * 6, FVector::ForwardVector, FVector::RightVector, 68, 2.8);
    for (int32 I = 0; I < 12; ++I)
    {
        const double A = I * UE_TWO_PI / 12;
        const FVector R(0, FMath::Cos(A), FMath::Sin(A)), Side(0, -R.Z, R.Y);
        Body.Leaf(BackCenter + R * 72, BackCenter + R * (98 + 10 * (I % 2)), Side * 7, FVector(-6, 0, 0));
        const FVector GroundR = Radial(A);
        Crown.Leaf(GroundR * 48 + Up * 4, GroundR * 78 + Up * 16, (Up ^ GroundR) * 8, Up * 6);
    }
    Crown.Hoop({64, 0, 96}, FVector::ForwardVector, FVector::RightVector, 58, 2.6, -UE_PI * .38, UE_PI * .38);
}

void Guru(FSurface& Body, FSurface& Rim, FSurface& Crown)
{
    // Twelve-Syllable Vajra Guru Mantra ("上師心咒 — 嗡阿吽班雜咕嚕貝瑪悉地吽")
    Rim.Hoop(Up * 8, FVector::ForwardVector, FVector::RightVector, 126, 3.8);
    Rim.Hoop(Up * 10, FVector::ForwardVector, FVector::RightVector, 74, 2.4);
    for (int32 J = 0; J < 12; ++J)
    {
        const FVector R = Radial(J * UE_TWO_PI / 12);
        Rim.Stroke(R * 22 + Up * 9, R * 124 + Up * 9, 2.0);
        Body.Leaf(R * 68 + Up * 6, R * 144 + Up * 28, (Up ^ R) * 15, Up * 12);
    }
    for (int32 J = 0; J < 8; ++J)
    {
        const FVector R = Radial((J + .5) * UE_TWO_PI / 8);
        Body.Leaf(R * 54 + Up * 10, R * 128 + Up * 165, (Up ^ R) * 16, R * 22);
    }
    for (int32 J = 0; J < 5; ++J)
    {
        FVector Last = Radial(J * UE_TWO_PI / 5) * 104 + Up * 12;
        for (int32 I = 1; I <= 28; ++I)
        {
            const double T = I / 28.;
            const FVector Next = Radial(J * UE_TWO_PI / 5 + 5.2 * T) * (104 - 78 * T) + Up * (12 + T * 248);
            Crown.Stroke(Last, Next, 5.2 - 2.4 * T);
            Last = Next;
        }
    }
    Crown.Hoop(Up * 238, FVector::ForwardVector, FVector::RightVector, 46, 2.6);
    Rim.Profile({{0,242},{18,268},{8,288},{0,312}}, 8);
}

const FLinearColor Fill[] = {
    {.04f, .52f, .88f, .78f},  // 0 Hum Bolt: Deep Vajra Turquoise-Sapphire
    {.96f, .38f, .06f, .76f},  // 1 Six-Syllable: Cinnabar-Saffron Lotus
    {.10f, .16f, .78f, .86f},  // 2 Phurba: Wrathful Lapis-Indigo Iron
    {.92f, .48f, .08f, .78f},  // 3 Ghanta Bell: Burnished Bronze-Amber
    {.86f, .14f, .38f, .52f},  // 4 Lotus Shield: Silky Translucent Padma Ruby-Rose
    {.06f, .62f, .52f, .76f},  // 5 Dharmapala: Glacial Himalayan Turquoise
    {.78f, .14f, .28f, .74f},  // 6 Vajra Guru: Padma Crimson-Magenta Brilliance
};
const FLinearColor Edge[] = {
    {.28f, 1.35f, 1.45f, .95f}, // 0 Diamond-Cyan Rim
    {1.48f, 1.05f, .26f, .95f}, // 1 Sacred Gold Rim
    {1.35f, .72f, .16f, .96f},  // 2 Gilt Vajra Hilt
    {1.48f, 1.15f, .46f, .94f}, // 3 Golden Bell Sonic Rim
    {1.38f, .88f, .32f, .88f},  // 4 Golden Lotus Filaments
    {1.38f, 1.08f, .38f, .94f}, // 5 Oath Gold Sunburst
    {1.55f, 1.18f, .32f, .96f}, // 6 Pure-Vision Burnished Gold
};
const FLinearColor Accent[] = {
    {1.42f, 1.12f, .36f, .94f}, // 0 Golden Vajra Prong Head
    {.24f, 1.28f, 1.15f, .90f}, // 1 Turquoise Mani Jewels
    {1.55f, .22f, .08f, .90f},  // 2 Crimson Wisdom-Fire Seal
    {.28f, 1.25f, 1.18f, .84f}, // 3 Turquoise Prajna Harmonics
    {.26f, 1.28f, 1.12f, .82f}, // 4 Turquoise Seed-Syllable Crown
    {.55f, 1.35f, 1.55f, .88f}, // 5 Snow-Crystal Oath Pedestal & Crescent
    {.28f, 1.38f, 1.22f, .88f}, // 6 Rainbow Turquoise Thigle Spirals
};

void Impact(FSurface& Body, FSurface& Rim, int32 SourceSlot)
{
    if (SourceSlot == 0)
    {
        // Two broken turquoise ripples, broadside to the incoming seed bolt.
        for (int32 I = 0; I < 3; ++I)
        {
            const double A = I * UE_TWO_PI / 3;
            Body.Hoop(FVector::ZeroVector, FVector::RightVector, Up, 39, 4, A + .12, A + 1.65);
            Rim.Hoop(FVector::ZeroVector, FVector::RightVector, Up, 51, 2, A + .43, A + 1.67);
        }
        return;
    }
    if (SourceSlot == 2)
    {
        // The triangular-faced dagger stamps a three-point seal.
        for (int32 I = 0; I < 3; ++I)
        {
            const double A = I * UE_TWO_PI / 3;
            const FVector R(0,FMath::Sin(A),FMath::Cos(A)), S(0,R.Z,-R.Y);
            Body.Leaf(R * 11, R * 73, S * 9, FVector(-9,0,0));
            Rim.Stroke(R * 33, FVector(0,FMath::Sin(A+UE_TWO_PI/3),FMath::Cos(A+UE_TWO_PI/3)) * 33, 3);
        }
        return;
    }
    for (int32 I = 0; I < 9; ++I)
    {
        const double A = I * UE_TWO_PI / 9;
        const FVector R(0, FMath::Cos(A), FMath::Sin(A)), Side(0,-R.Z,R.Y);
        FSurface& Part = I % 2 ? Rim : Body;
        Part.Leaf(R * 14, R * (49 + (I % 3) * 13), Side * 4, FVector(-7,0,2));
    }
}
}

ATibetRitualEffect::ATibetRitualEffect()
{
    PrimaryActorTick.bCanEverTick = true;
    Motif = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("Ritual motif"));
    SetRootComponent(Motif);
    Motif->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Motif->SetGenerateOverlapEvents(false);
    Motif->SetCastShadow(false);
    Motif->SetCanEverAffectNavigation(false);

    Aura = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("Ritual crown aura"));
    Aura->SetupAttachment(Motif);
    Aura->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Aura->SetGenerateOverlapEvents(false);
    Aura->SetCastShadow(false);
    Aura->SetCanEverAffectNavigation(false);
}

void ATibetRitualEffect::Start(int32 SkillSlot, const FVector& From, const FVector& To, APawn* Caster,
    UMaterialInterface* Material)
{
    Slot = SkillSlot; Origin = From; Target = To; Source = Caster;
    Facing = (To - From).GetSafeNormal2D().Rotation();
    const FVector Side = FRotationMatrix(Facing).GetUnitAxis(EAxis::Y);
    const float Lifetimes[] = {.79f,.92f,1.15f,.92f,6.f,1.68f,1.45f};
    Duration = Lifetimes[Slot];
    FSurface Body, Rim, Crown;
    switch (Slot)
    {
    case 0:
        Hum(Body, Rim, Crown);
        Origin += Side * 54 + Up * 22;
        BuildBoltTrail(Material);
        break;
    case 1: Chant(Body, Rim, Crown); Origin = Caster->GetActorLocation() - Up * 78; break;
    case 2: Phurba(Body, Rim, Crown); break;
    case 3: Bell(Body, Rim, Crown); Origin += Side * 58; break;
    case 4: Lotus(Body, Rim, Crown); break;
    case 5:
    {
        Invocation(Body, Rim, Crown);
        Origin = Caster->GetActorLocation() + Side * 136 + Facing.Vector() * 64 - Up * 84;
        auto* Figure = NewObject<UStaticMeshComponent>(this);
        Figure->SetupAttachment(Motif);
        Figure->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,TEXT("/Game/Figures/Tenma.Tenma")));
        // Blender -Y forward imports to UE +Y; -90 deg Yaw aligns Tenma forward (+X) toward the enemy!
        Figure->SetRelativeRotation(FRotator(0,-90,0));
        Figure->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Figure->SetGenerateOverlapEvents(false);
        Figure->SetCastShadow(false);
        Figure->RegisterComponent();
        break;
    }
    case 6:
    {
        Guru(Body, Rim, Crown);
        Origin = (Caster ? Caster->GetActorLocation() : Target) + Facing.Vector() * 145 - Up * 82;
        auto* Vision = NewObject<UStaticMeshComponent>(this);
        Vision->SetupAttachment(Motif);
        Vision->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,TEXT("/Game/Figures/GuruVision.GuruVision")));
        Vision->SetRelativeLocation(FVector(0, 0, 8));
        Vision->SetRelativeRotation(FRotator(0, -90, 0));
        Vision->SetRelativeScale3D(FVector(1.08f));
        Vision->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Vision->SetGenerateOverlapEvents(false);
        Vision->SetCastShadow(false);
        Vision->RegisterComponent();
        break;
    }
    default: Destroy(); return;
    }
    Body.Install(Motif, 0, Material, Fill[Slot]);
    Rim.Install(Motif, 1, Material, Edge[Slot]);
    Crown.Install(Aura, 0, Material, Accent[Slot]);
    SetLifeSpan(Duration);
    Animate();
}

FVector ATibetRitualEffect::BoltPoint(double T) const
{
    const FVector Side = FRotationMatrix(Facing).GetUnitAxis(EAxis::Y);
    // An unbroken shoulder-high arc stays legible from the normal rear camera.
    const double Arch = FMath::Sin(UE_PI * T);
    return FMath::Lerp(Origin,Target,T) + Side * (117 * Arch) + Up * (87 * Arch);
}

void ATibetRitualEffect::BuildBoltTrail(UMaterialInterface* Material)
{
    BoltTrail = NewObject<UProceduralMeshComponent>(this);
    BoltTrail->SetupAttachment(Motif);
    BoltTrail->SetAbsolute(true,true,true);
    BoltTrail->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    BoltTrail->SetCanEverAffectNavigation(false);
    BoltTrail->SetCastShadow(false);
    BoltTrail->RegisterComponent();
    BoltTrail->SetWorldLocation(Origin);
    auto* Ink = UMaterialInstanceDynamic::Create(Material,this);
    if (Ink) Ink->SetVectorParameterValue(TEXT("Color"), Fill[0]);
    // Reveal the arc behind the moving tip, then withdraw it from the hand.
    for (int32 Part = 0; Part < 8; ++Part)
    {
        FSurface Ribbon;
        for (int32 J = 0; J < 3; ++J)
        {
            const double A = (Part * 3 + J) / 24., B = A + 1. / 24;
            const FVector P = BoltPoint(A) - Origin, Q = BoltPoint(B) - Origin;
            Ribbon.Stroke(P,Q,3.3 + 2.7 * FMath::Sin(UE_PI*A));
            Ribbon.Stroke(P + Up * (10 + 7 * FMath::Sin(A * 13)),
                          Q + Up * (10 + 7 * FMath::Sin(B * 13)),1.75);
        }
        BoltTrail->CreateMeshSection(Part,Ribbon.Points,Ribbon.Indices,Ribbon.Normals,{}, {}, {},false);
        BoltTrail->SetMaterial(Part,Ink);
    }
}

void ATibetRitualEffect::StartImpact(const FVector& Position, const FVector& Outward, int32 SourceSlot, bool bFinal,
    UMaterialInterface* Material)
{
    Slot = 7; Origin = Position; Facing = Outward.GetSafeNormal2D().Rotation();
    bFinisher = bFinal;
    Duration = bFinal ? .68f : .45f;
    FSurface Body, Rim, Crown;
    Impact(Body, Rim, SourceSlot);
    Crown.Hoop(FVector::ZeroVector, FVector::RightVector, Up, bFinal ? 68 : 42, bFinal ? 3.2 : 2.0);
    if (bFinal)
    {
        for (int32 I = 0; I < 8; ++I)
        {
            const double A = I * UE_TWO_PI / 8.0;
            const FVector R(0, FMath::Cos(A), FMath::Sin(A)), Side(0, -R.Z, R.Y);
            Crown.Leaf(R * 22, R * 88 + Up * 42, Side * 7, Up * 16);
        }
    }
    const int32 ClampedSlot = FMath::Clamp(SourceSlot, 0, int32(UE_ARRAY_COUNT(Fill)) - 1);
    Body.Install(Motif, 0, Material, Fill[ClampedSlot]);
    Rim.Install(Motif, 1, Material, Edge[ClampedSlot]);
    Crown.Install(Aura, 0, Material, bFinal ? FLinearColor(1.95f, 1.38f, 0.30f, 0.95f) : Accent[ClampedSlot]);
    SetLifeSpan(Duration);
    Animate();
}

void ATibetRitualEffect::StartEnemyAttack(AActor& Attacker, bool bStrike, bool bBoss, float Radius,
    float Windup, UMaterialInterface* Material)
{
    SetOwner(&Attacker);
    Slot = bStrike ? EnemyStrike : EnemyWindup;
    Origin = Attacker.GetActorLocation() + Up * 12;
    Facing = FRotator(0, Attacker.GetActorRotation().Yaw - 90, 0);
    Duration = bStrike ? .38f : Windup;
    FSurface Body, Rim;
    if (!bStrike)
    {
        // The border remains at the exact damage radius while the teeth turn inward.
        Body.Hoop(FVector::ZeroVector, FVector::ForwardVector, FVector::RightVector, Radius - 4, 4);
        for (int32 I = 0; I < 8; ++I)
        {
            const FVector R = Radial(I * UE_TWO_PI / 8);
            Rim.Leaf(R * (Radius - 10), R * (Radius - 35), (Up ^ R) * 8, Up * 9);
        }
    }
    else if (bBoss)
    {
        Body.Hoop(Up * 8, FVector::ForwardVector, FVector::RightVector, Radius - 8, 8);
        for (int32 I = 0; I < 12; ++I)
        {
            const FVector R = Radial(I * UE_TWO_PI / 12);
            Rim.Leaf(R * 60, R * Radius + Up * (I % 2 ? 76 : 42), (Up ^ R) * 10, Up * 24);
        }
    }
    else
    {
        // Two raised, tapered claw arcs read above a monster's feet and the terrain.
        for (int32 J = 0; J < 2; ++J)
        {
            FSurface& Arc = J == 0 ? Body : Rim;
            const auto ClawEdge = [Radius, J](int32 Step, double Sign) {
                const double T = Step / 12.;
                return Radial((T - .5) * 2.65) * (Radius - 12 * J) +
                    Up * (48 + 62 * T + 22 * J + Sign * (1 + 9 * FMath::Sin(T * UE_PI)));
            };
            for (int32 I = 0; I < 12; ++I)
                Arc.Quad(ClawEdge(I, -1), ClawEdge(I + 1, -1), ClawEdge(I + 1, 1), ClawEdge(I, 1));
        }
    }
    Body.Install(Motif, 0, Material, FLinearColor(1.65f,.025f,.035f));
    Rim.Install(Motif, 1, Material, FLinearColor(2.f,.47f,.09f));
    if (bStrike) SetLifeSpan(Duration);
    Animate();
}

void ATibetRitualEffect::Tick(float Dt)
{
    Super::Tick(Dt);
    Age += Dt;
    Animate();
}

void ATibetRitualEffect::Animate()
{
    if (Duration <= 0) return;
    const float T = FMath::Clamp(Age / Duration, 0.f, 1.f);
    const float Rise = 1 - FMath::Square(1 - T);
    const float Fade = 1 - FMath::SmoothStep(.74f,1.f,T);
    FVector At = Origin, Scale(1);
    FRotator Rotation = Facing;
    switch (Slot)
    {
    case 0:
    {
        const double Travel = FMath::Min(double(T) / .60, 1.);
        At = BoltPoint(Travel);
        Rotation = (BoltPoint(FMath::Min(Travel+.015,1.)) - BoltPoint(FMath::Max(0.,Travel-.015))).Rotation();
        Scale = FVector(.83 + .27 * Rise, Fade, Fade);
        if (BoltTrail)
            for (int32 Part = 0; Part < 8; ++Part)
                BoltTrail->SetMeshSectionVisible(Part, Part < FMath::CeilToInt(Travel * 8) &&
                    T < .60f + .40f * (Part+1) / 8);
        break;
    }
    case 1:
        Rotation.Yaw += 25 * Rise;
        Scale = FVector(.32 + 1.15 * Rise) * (.55 + .45 * Fade);
        At.Z += 7 * Rise;
        break;
    case 2:
        {
            const float Drop = 1 - FMath::SmoothStep(.09f,.54f,T);
            const FVector Side = FRotationMatrix(Facing).GetUnitAxis(EAxis::Y);
            At = Target + Side * (44 + 64 * Drop) + Up * (52 + 109 * Drop);
            Rotation.Roll = 27 + 16 * Drop;
            Rotation.Pitch = -9;
            Scale = FVector(1.33,1.33,1.22) * (.50 + .50 * Fade);
        }
        break;
    case 3:
        At = FMath::Lerp(Origin, Target, double(.12f + .75f * Rise));
        Rotation.Roll = FMath::Sin(12 * T) * 14;
        Scale = FVector(.80 + .33 * Rise) * (.55 + .45 * Fade);
        break;
    case 4:
        if (Source.IsValid()) At = Source->GetActorLocation() - Up * 76;
        Rotation.Yaw += Age * 21;
        Scale = FVector(.69 + .30 * FMath::Exp(-Age * 2) + .03 * FMath::Sin(Age * 4)) * (.4 + .6 * Fade);
        break;
    case 5:
        At.Z += 12 + 19 * FMath::Sin(T * UE_PI);
        Scale = FVector(.74 + .28 * FMath::Sin(T * UE_PI)) * (.60 + .40 * Fade);
        break;
    case 6:
        At = Origin + Up * (6 * Rise);
        if (Aura) Aura->SetRelativeRotation(FRotator(0, 95 * Rise, 0));
        Scale = FVector(.92 + .24 * Rise, .92 + .24 * Rise, .94 + .20 * Rise) * (.55 + .45 * Fade);
        break;
    case EnemyWindup:
        Rotation.Yaw += 30 * Rise;
        Scale.Z = .5 + 2 * T;
        break;
    case EnemyStrike:
        Scale = FVector(.55 + .45 * Rise, .55 + .45 * Rise, (.65 + .35 * Rise) * Fade);
        Rotation.Yaw += 38 * (Rise - .5);
        At.Z += 8 * Rise;
        break;
    case 7:
        Scale = FVector((bFinisher ? 1.35 : 1.) * (.35 + 1.08 * Rise) * (.35 + .65 * Fade));
        Rotation.Roll = 12 * Rise;
        break;
    }
    SetActorLocationAndRotation(At, Rotation);
    SetActorScale3D(Scale);
}
